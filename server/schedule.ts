/**
 * Расписание приёма по умолчанию.
 * Используется, пока специалист не задал своё через Mini App. Файл без импортов —
 * его подключает и сервер, и фронтенд (алиас @shared).
 */

import type { ScheduleSettings } from './types.js';

export const DEFAULT_SCHEDULE: ScheduleSettings = {
  days: {
    '1': ['10:00', '12:00', '15:00', '17:00', '19:00'], // понедельник
    '2': ['10:00', '12:00', '15:00', '17:00', '19:00'], // вторник
    '3': ['12:00', '15:00', '17:00', '19:00'], // среда
    '4': ['10:00', '12:00', '15:00', '17:00', '19:00'], // четверг
    '5': ['10:00', '12:00', '15:00'], // пятница
    '6': ['11:00', '13:00'], // суббота
    // воскресенье — выходной
  },
  horizonDays: 14,
  minHoursBefore: 12,
};

/** Все возможные слоты в интерфейсе настройки: с 08:00 до 21:00 с шагом в час. */
export const ALL_TIMES: string[] = Array.from({ length: 14 }, (_, index) => `${String(8 + index).padStart(2, '0')}:00`);

/** Проверяет и нормализует настройки, пришедшие извне (из Mini App или базы). */
export function normalizeSchedule(input: unknown): ScheduleSettings | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Partial<ScheduleSettings>;

  const days: Record<string, string[]> = {};
  if (raw.days && typeof raw.days === 'object') {
    for (const [day, times] of Object.entries(raw.days)) {
      if (!/^[0-6]$/.test(day) || !Array.isArray(times)) continue;
      const clean = [...new Set(times.filter((t): t is string => typeof t === 'string' && /^\d{2}:\d{2}$/.test(t)))].sort();
      if (clean.length > 0) days[day] = clean;
    }
  }

  const horizonDays = Number(raw.horizonDays);
  const minHoursBefore = Number(raw.minHoursBefore);

  return {
    days,
    horizonDays: Number.isInteger(horizonDays) && horizonDays >= 1 && horizonDays <= 60 ? horizonDays : DEFAULT_SCHEDULE.horizonDays,
    minHoursBefore:
      Number.isInteger(minHoursBefore) && minHoursBefore >= 0 && minHoursBefore <= 72
        ? minHoursBefore
        : DEFAULT_SCHEDULE.minHoursBefore,
  };
}
