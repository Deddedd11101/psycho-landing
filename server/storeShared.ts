/**
 * Общий контракт хранилища и вспомогательные функции.
 * Вынесены отдельно от store.ts, чтобы реализации в stores/ не импортировали
 * модуль, который сам их создаёт (циклический импорт).
 */

import { config } from './config.js';
import type { ScheduleSettings, SessionRecord } from './types.js';

/**
 * Занятые слоты: дата (YYYY-MM-DD) -> список занятого времени (HH:mm).
 * Персональных данных здесь нет, поэтому карту можно безопасно отдавать на сайт.
 */
export type BookedSlots = Record<string, string[]>;

/** Фильтр для выборки заявок в Mini App специалиста. */
export interface ListSessionsFilter {
  /** Нижняя граница даты встречи (включительно), YYYY-MM-DD. */
  from?: string;
  /** Верхняя граница даты встречи (включительно), YYYY-MM-DD. */
  to?: string;
  /** Только заявки без выбранного времени («связаться») — список обращений. */
  withoutSlot?: boolean;
}

/** Общий интерфейс хранилища — от него зависит остальной код. */
export interface SessionStore {
  get(id: string): Promise<SessionRecord | null>;
  set(record: SessionRecord): Promise<void>;
  delete(id: string): Promise<void>;
  /** Заявки для Mini App: по диапазону дат встречи или обращения без слота. */
  listSessions(filter: ListSessionsFilter): Promise<SessionRecord[]>;

  /** Все занятые слоты — нужны календарю на сайте. */
  getBookedSlots(): Promise<BookedSlots>;
  /**
   * Пытается занять слот для заявки. Возвращает false, если его уже заняли —
   * тогда клиенту показывается просьба выбрать другое время.
   */
  reserveSlot(date: string, time: string, sessionId: string): Promise<boolean>;
  /** Освобождает слот (отмена или неудачное создание заявки). */
  releaseSlot(date: string, time: string): Promise<void>;

  /** Настройки расписания; null — специалист ещё не задавал своё. */
  getSchedule(): Promise<ScheduleSettings | null>;
  setSchedule(schedule: ScheduleSettings): Promise<void>;

  /** Понятное человеку название реализации — выводим в логах при старте. */
  readonly kind: 'memory' | 'upstash' | 'sqlite';
}

/** Сегодняшняя дата в формате YYYY-MM-DD (локальное время сервера). */
export function todayKey(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

/** Убирает из карты прошедшие даты, чтобы она не росла бесконечно. */
export function dropPastDates(slots: BookedSlots): BookedSlots {
  const today = todayKey();
  const result: BookedSlots = {};
  for (const [date, times] of Object.entries(slots)) {
    if (date >= today && times.length > 0) result[date] = times;
  }
  return result;
}

/**
 * Момент, после которого заявку можно удалить.
 * Заявка с датой встречи живёт до встречи плюс 30 дней (история для специалиста),
 * заявка без даты — SESSION_TTL_SECONDS с момента создания.
 */
export function sessionExpiresAt(record: SessionRecord): number {
  const byTtl = record.createdAt + config.sessionTtlSeconds * 1000;
  if (!record.slot) return byTtl;

  const [year, month, day] = record.slot.date.split('-').map(Number);
  const meeting = new Date(year, month - 1, day, 23, 59).getTime();
  return Math.max(byTtl, meeting + 30 * 24 * 60 * 60 * 1000);
}

/** Эффективный статус, учитывая старые записи без поля status. */
export function sessionStatus(record: SessionRecord): NonNullable<SessionRecord['status']> {
  if (record.status) return record.status;
  return record.confirmedAt ? 'confirmed' : 'pending';
}

