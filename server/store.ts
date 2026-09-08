/**
 * Хранилище сессий воронки.
 *
 * Реализовано два варианта:
 *  1. MemoryStore — обычный Map в памяти процесса. Подходит для локальной разработки
 *     и для классического сервера (Express на VPS). При перезапуске данные теряются.
 *  2. UpstashStore — Redis по HTTP (Upstash REST API). Нужен на Vercel, потому что
 *     serverless-функции не разделяют память между вызовами.
 *
 * Нужная реализация выбирается автоматически по наличию переменных UPSTASH_*.
 */

import { config } from './config.js';
import type { SessionRecord } from './types.js';

/** Общий интерфейс хранилища — от него зависит остальной код. */
export interface SessionStore {
  get(id: string): Promise<SessionRecord | null>;
  set(record: SessionRecord): Promise<void>;
  delete(id: string): Promise<void>;
  /** Понятное человеку название реализации — выводим в логах при старте. */
  readonly kind: 'memory' | 'upstash';
}

/** Хранилище в памяти процесса с ручной очисткой протухших записей. */
class MemoryStore implements SessionStore {
  readonly kind = 'memory' as const;
  /** id сессии -> запись + момент истечения. */
  private readonly items = new Map<string, { record: SessionRecord; expiresAt: number }>();

  async get(id: string): Promise<SessionRecord | null> {
    const item = this.items.get(id);
    if (!item) return null;
    // Запись протухла — удаляем и делаем вид, что её не было.
    if (item.expiresAt < Date.now()) {
      this.items.delete(id);
      return null;
    }
    return item.record;
  }

  async set(record: SessionRecord): Promise<void> {
    this.cleanup();
    this.items.set(record.id, {
      record,
      expiresAt: Date.now() + config.sessionTtlSeconds * 1000,
    });
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }

  /** Удаляет протухшие записи, чтобы Map не рос бесконечно. */
  private cleanup(): void {
    const now = Date.now();
    for (const [id, item] of this.items) {
      if (item.expiresAt < now) this.items.delete(id);
    }
  }
}

/** Хранилище поверх Upstash Redis REST API (работает через обычный fetch). */
class UpstashStore implements SessionStore {
  readonly kind = 'upstash' as const;

  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  /** Выполняет команду Redis вида ['SET', key, value, 'EX', ttl]. */
  private async command<T>(parts: (string | number)[]): Promise<T> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parts),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Upstash вернул ${response.status}: ${text}`);
    }

    const data = (await response.json()) as { result: T };
    return data.result;
  }

  private key(id: string): string {
    return `psycho:session:${id}`;
  }

  async get(id: string): Promise<SessionRecord | null> {
    const raw = await this.command<string | null>(['GET', this.key(id)]);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionRecord;
    } catch {
      // Битые данные лучше считать отсутствующими, чем ронять запрос.
      return null;
    }
  }

  async set(record: SessionRecord): Promise<void> {
    await this.command(['SET', this.key(record.id), JSON.stringify(record), 'EX', config.sessionTtlSeconds]);
  }

  async delete(id: string): Promise<void> {
    await this.command(['DEL', this.key(id)]);
  }
}

/**
 * Единственный экземпляр хранилища на процесс.
 * В dev-режиме сохраняем его в globalThis, чтобы hot-reload не сбрасывал данные.
 */
const globalRef = globalThis as typeof globalThis & { __psychoStore?: SessionStore };

function createStore(): SessionStore {
  if (config.upstashUrl && config.upstashToken) {
    return new UpstashStore(config.upstashUrl, config.upstashToken);
  }
  return new MemoryStore();
}

export const sessionStore: SessionStore = globalRef.__psychoStore ?? (globalRef.__psychoStore = createStore());
