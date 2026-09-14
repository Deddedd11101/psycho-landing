/**
 * Хранилище на SQLite через встроенный модуль node:sqlite (Node 22.13+).
 * Один файл на диске, никаких отдельных сервисов и нативных сборок.
 *
 * Таблицы:
 *  - sessions — заявки (JSON записи + индексируемые поля для выборок);
 *  - bookings — занятые слоты (первичный ключ дата+время исключает двойную запись);
 *  - settings — настройки (расписание приёма).
 */

import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

import {
  dropPastDates,
  sessionExpiresAt,
  sessionStatus,
  type BookedSlots,
  type ListSessionsFilter,
  type SessionStore,
} from '../storeShared.js';
import type { ScheduleSettings, SessionRecord } from '../types.js';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    data        TEXT    NOT NULL,
    created_at  INTEGER NOT NULL,
    expires_at  INTEGER NOT NULL,
    slot_date   TEXT,
    status      TEXT    NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_slot_date ON sessions (slot_date);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires   ON sessions (expires_at);

  CREATE TABLE IF NOT EXISTS bookings (
    date       TEXT NOT NULL,
    time       TEXT NOT NULL,
    session_id TEXT NOT NULL,
    PRIMARY KEY (date, time)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

/** Строка таблицы sessions. */
interface SessionRow {
  data: string;
}

export class SqliteStore implements SessionStore {
  readonly kind = 'sqlite' as const;
  private readonly db: DatabaseSync;

  constructor(dbPath: string) {
    // Относительный путь считаем от корня репозитория (server/ лежит в корне).
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    const absolute = path.isAbsolute(dbPath) ? dbPath : path.join(root, dbPath);
    mkdirSync(path.dirname(absolute), { recursive: true });

    this.db = new DatabaseSync(absolute);
    // WAL — параллельное чтение не блокируется записью; на одном процессе это самый удобный режим.
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec(SCHEMA);
    this.cleanup();
  }

  /* ---------- Заявки ---------- */

  async get(id: string): Promise<SessionRecord | null> {
    const row = this.db
      .prepare('SELECT data FROM sessions WHERE id = ? AND expires_at > ?')
      .get(id, Date.now()) as SessionRow | undefined;
    return row ? (JSON.parse(row.data) as SessionRecord) : null;
  }

  async set(record: SessionRecord): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO sessions (id, data, created_at, expires_at, slot_date, status)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           data = excluded.data,
           expires_at = excluded.expires_at,
           slot_date = excluded.slot_date,
           status = excluded.status`,
      )
      .run(
        record.id,
        JSON.stringify(record),
        record.createdAt,
        sessionExpiresAt(record),
        record.slot?.date ?? null,
        sessionStatus(record),
      );
  }

  async delete(id: string): Promise<void> {
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  }

  async listSessions(filter: ListSessionsFilter): Promise<SessionRecord[]> {
    const conditions: string[] = ['expires_at > ?'];
    const params: (string | number)[] = [Date.now()];

    if (filter.withoutSlot) {
      conditions.push('slot_date IS NULL');
    } else {
      conditions.push('slot_date IS NOT NULL');
      if (filter.from) {
        conditions.push('slot_date >= ?');
        params.push(filter.from);
      }
      if (filter.to) {
        conditions.push('slot_date <= ?');
        params.push(filter.to);
      }
    }

    const rows = this.db
      .prepare(`SELECT data FROM sessions WHERE ${conditions.join(' AND ')} ORDER BY slot_date, created_at`)
      .all(...params) as unknown as SessionRow[];

    return rows.map((row) => JSON.parse(row.data) as SessionRecord);
  }

  /* ---------- Занятые слоты ---------- */

  async getBookedSlots(): Promise<BookedSlots> {
    const rows = this.db.prepare('SELECT date, time FROM bookings ORDER BY date, time').all() as unknown as {
      date: string;
      time: string;
    }[];

    const booked: BookedSlots = {};
    for (const row of rows) {
      (booked[row.date] ??= []).push(row.time);
    }
    return dropPastDates(booked);
  }

  async reserveSlot(date: string, time: string, sessionId: string): Promise<boolean> {
    // INSERT OR IGNORE + проверка changes: атомарно и без гонок благодаря первичному ключу.
    const result = this.db
      .prepare('INSERT OR IGNORE INTO bookings (date, time, session_id) VALUES (?, ?, ?)')
      .run(date, time, sessionId);
    return result.changes > 0;
  }

  async releaseSlot(date: string, time: string): Promise<void> {
    this.db.prepare('DELETE FROM bookings WHERE date = ? AND time = ?').run(date, time);
  }

  /* ---------- Настройки ---------- */

  async getSchedule(): Promise<ScheduleSettings | null> {
    const row = this.db.prepare("SELECT value FROM settings WHERE key = 'schedule'").get() as
      | { value: string }
      | undefined;
    if (!row) return null;

    try {
      return JSON.parse(row.value) as ScheduleSettings;
    } catch {
      return null;
    }
  }

  async setSchedule(schedule: ScheduleSettings): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO settings (key, value) VALUES ('schedule', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(JSON.stringify(schedule));
  }

  /* ---------- Служебное ---------- */

  /** Удаляет протухшие заявки и брони на прошедшие даты. Вызывается при старте. */
  private cleanup(): void {
    const removed = this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate(),
    ).padStart(2, '0')}`;
    const freed = this.db.prepare('DELETE FROM bookings WHERE date < ?').run(todayKey);

    if (removed.changes > 0 || freed.changes > 0) {
      console.log(`[sqlite] Очистка: удалено заявок ${removed.changes}, прошедших броней ${freed.changes}`);
    }
  }
}
