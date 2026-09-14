/**
 * Хранилище поверх Upstash Redis REST API — для Vercel, где serverless-функции
 * не разделяют память. Работает через обычный fetch.
 *
 * Ключи:
 *  - psycho:session:<id>  — заявка (JSON) с TTL;
 *  - psycho:sessions      — SET с id всех заявок (индекс для выборок в Mini App);
 *  - psycho:booked        — карта занятых слотов (JSON);
 *  - psycho:schedule      — настройки расписания (JSON).
 */

import {
  dropPastDates,
  sessionExpiresAt,
  type BookedSlots,
  type ListSessionsFilter,
  type SessionStore,
} from '../storeShared.js';
import type { ScheduleSettings, SessionRecord } from '../types.js';

const KEY_INDEX = 'psycho:sessions';
const KEY_BOOKED = 'psycho:booked';
const KEY_SCHEDULE = 'psycho:schedule';

export class UpstashStore implements SessionStore {
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

  /* ---------- Заявки ---------- */

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
    const ttlSeconds = Math.max(60, Math.ceil((sessionExpiresAt(record) - Date.now()) / 1000));
    await this.command(['SET', this.key(record.id), JSON.stringify(record), 'EX', ttlSeconds]);
    await this.command(['SADD', KEY_INDEX, record.id]);
  }

  async delete(id: string): Promise<void> {
    await this.command(['DEL', this.key(id)]);
    await this.command(['SREM', KEY_INDEX, id]);
  }

  async listSessions(filter: ListSessionsFilter): Promise<SessionRecord[]> {
    const ids = await this.command<string[]>(['SMEMBERS', KEY_INDEX]);
    const records: SessionRecord[] = [];

    for (const id of ids) {
      const record = await this.get(id);
      // Ключ протух по TTL — чистим индекс.
      if (!record) {
        await this.command(['SREM', KEY_INDEX, id]);
        continue;
      }
      if (filter.withoutSlot) {
        if (!record.slot) records.push(record);
        continue;
      }
      if (!record.slot) continue;
      if (filter.from && record.slot.date < filter.from) continue;
      if (filter.to && record.slot.date > filter.to) continue;
      records.push(record);
    }

    return records.sort(
      (a, b) => (a.slot?.date ?? '').localeCompare(b.slot?.date ?? '') || a.createdAt - b.createdAt,
    );
  }

  /* ---------- Занятые слоты ---------- */

  async getBookedSlots(): Promise<BookedSlots> {
    const raw = await this.command<string | null>(['GET', KEY_BOOKED]);
    if (!raw) return {};
    try {
      return dropPastDates(JSON.parse(raw) as BookedSlots);
    } catch {
      return {};
    }
  }

  async reserveSlot(date: string, time: string): Promise<boolean> {
    // Чтение и запись выполняются двумя командами, поэтому теоретически возможна
    // гонка при одновременной записи двух клиентов на один слот. Для потока
    // частной практики этого достаточно; при необходимости заменяется скриптом Lua.
    const booked = await this.getBookedSlots();
    const times = booked[date] ?? [];
    if (times.includes(time)) return false;

    booked[date] = [...times, time];
    await this.command(['SET', KEY_BOOKED, JSON.stringify(booked)]);
    return true;
  }

  async releaseSlot(date: string, time: string): Promise<void> {
    const booked = await this.getBookedSlots();
    const times = booked[date];
    if (!times) return;

    const rest = times.filter((item) => item !== time);
    if (rest.length > 0) {
      booked[date] = rest;
    } else {
      delete booked[date];
    }

    await this.command(['SET', KEY_BOOKED, JSON.stringify(booked)]);
  }

  /* ---------- Настройки ---------- */

  async getSchedule(): Promise<ScheduleSettings | null> {
    const raw = await this.command<string | null>(['GET', KEY_SCHEDULE]);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ScheduleSettings;
    } catch {
      return null;
    }
  }

  async setSchedule(schedule: ScheduleSettings): Promise<void> {
    await this.command(['SET', KEY_SCHEDULE, JSON.stringify(schedule)]);
  }
}
