/**
 * Хранилище в памяти процесса — только для локальной разработки и тестов
 * (STORE=memory). При перезапуске всё теряется.
 */

import {
  dropPastDates,
  sessionExpiresAt,
  type BookedSlots,
  type ListSessionsFilter,
  type SessionStore,
} from '../storeShared.js';
import type { ScheduleSettings, SessionRecord } from '../types.js';

export class MemoryStore implements SessionStore {
  readonly kind = 'memory' as const;
  /** id заявки -> запись. Срок жизни считается на лету через sessionExpiresAt. */
  private readonly items = new Map<string, SessionRecord>();
  /** Занятые слоты: дата -> время -> id заявки. */
  private booked = new Map<string, Map<string, string>>();
  private schedule: ScheduleSettings | null = null;

  async get(id: string): Promise<SessionRecord | null> {
    const record = this.items.get(id);
    if (!record) return null;
    if (sessionExpiresAt(record) < Date.now()) {
      this.items.delete(id);
      return null;
    }
    return record;
  }

  async set(record: SessionRecord): Promise<void> {
    this.cleanup();
    this.items.set(record.id, record);
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }

  async listSessions(filter: ListSessionsFilter): Promise<SessionRecord[]> {
    this.cleanup();
    const result = [...this.items.values()].filter((record) => {
      if (filter.withoutSlot) return !record.slot;
      if (!record.slot) return false;
      if (filter.from && record.slot.date < filter.from) return false;
      if (filter.to && record.slot.date > filter.to) return false;
      return true;
    });
    return result.sort((a, b) => (a.slot?.date ?? '').localeCompare(b.slot?.date ?? '') || a.createdAt - b.createdAt);
  }

  async getBookedSlots(): Promise<BookedSlots> {
    const slots: BookedSlots = {};
    for (const [date, times] of this.booked) {
      slots[date] = [...times.keys()].sort();
    }
    return dropPastDates(slots);
  }

  async reserveSlot(date: string, time: string, sessionId: string): Promise<boolean> {
    const times = this.booked.get(date) ?? new Map<string, string>();
    if (times.has(time)) return false;
    times.set(time, sessionId);
    this.booked.set(date, times);
    return true;
  }

  async releaseSlot(date: string, time: string): Promise<void> {
    const times = this.booked.get(date);
    if (!times) return;
    times.delete(time);
    if (times.size === 0) this.booked.delete(date);
  }

  async getSchedule(): Promise<ScheduleSettings | null> {
    return this.schedule;
  }

  async setSchedule(schedule: ScheduleSettings): Promise<void> {
    this.schedule = schedule;
  }

  /** Удаляет протухшие записи, чтобы Map не рос бесконечно. */
  private cleanup(): void {
    const now = Date.now();
    for (const [id, record] of this.items) {
      if (sessionExpiresAt(record) < now) this.items.delete(id);
    }
  }
}
