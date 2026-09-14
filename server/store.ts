/**
 * Хранилище заявок, занятых слотов и настроек.
 *
 * Реализации (см. папку stores/):
 *  1. SqliteStore  — файл базы на диске (встроенный node:sqlite, без нативных зависимостей).
 *     Основной вариант для VPS: данные переживают перезапуск и обновления.
 *  2. MemoryStore  — Map в памяти процесса. Только для локальной разработки и тестов.
 *  3. UpstashStore — Redis по HTTP. Нужен на Vercel, где serverless-функции
 *     не разделяют память между вызовами.
 *
 * Выбор реализации — по переменным окружения (см. createStore ниже).
 * Контракт и вспомогательные функции — в storeShared.ts (реэкспортируются отсюда).
 */

import { config } from './config.js';
import type { SessionStore } from './storeShared.js';
import { MemoryStore } from './stores/memory.js';
import { SqliteStore } from './stores/sqlite.js';
import { UpstashStore } from './stores/upstash.js';

export * from './storeShared.js';

/**
 * Единственный экземпляр хранилища на процесс.
 * В dev-режиме сохраняем его в globalThis, чтобы hot-reload не сбрасывал данные.
 */
const globalRef = globalThis as typeof globalThis & { __psychoStore?: SessionStore };

function createStore(): SessionStore {
  if (config.upstashUrl && config.upstashToken) {
    return new UpstashStore(config.upstashUrl, config.upstashToken);
  }
  if (config.storeKind === 'memory') {
    return new MemoryStore();
  }
  return new SqliteStore(config.dbPath);
}

export const sessionStore: SessionStore = globalRef.__psychoStore ?? (globalRef.__psychoStore = createStore());
