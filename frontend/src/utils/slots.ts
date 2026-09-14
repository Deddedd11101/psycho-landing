/**
 * Построение календаря записи.
 *
 * Рабочие часы и занятое время приходят с сервера (GET /api/slots): специалист
 * правит расписание в Mini App, и сайт сразу показывает актуальные слоты.
 * Пока ответ не пришёл, используется расписание по умолчанию (@shared/schedule).
 */

import { DEFAULT_SCHEDULE } from '@shared/schedule';
import type { ScheduleSettings } from '@shared/types';

/** Занятые слоты: дата YYYY-MM-DD -> список времени. Приходят с сервера (GET /api/slots). */
export type BookedSlots = Record<string, string[]>;

export type { ScheduleSettings };

/** Один доступный день с набором свободного времени. */
export interface AvailableDay {
  /** Дата в формате YYYY-MM-DD. */
  date: string;
  /** Число месяца: 14. */
  dayNumber: number;
  /** Короткое название месяца: «сент.». */
  monthShort: string;
  /** Короткое название дня недели: «пн». */
  weekdayShort: string;
  /** Свободное время в этот день. */
  times: string[];
  /** Сегодняшняя дата — подсвечиваем в интерфейсе. */
  isToday: boolean;
}

const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const MONTHS_SHORT = ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июня', 'июля', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];

/** Приводит дату к строке YYYY-MM-DD в локальном часовом поясе. */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Возвращает список дней со свободным временем в горизонте записи.
 * Занятое время (booked) исключается, дни без свободных слотов не показываются.
 */
export function getAvailableDays(
  booked: BookedSlots = {},
  schedule: ScheduleSettings = DEFAULT_SCHEDULE,
  now: Date = new Date(),
): AvailableDay[] {
  const days: AvailableDay[] = [];
  const todayKey = toDateKey(now);
  // Ближайший момент, на который ещё можно записаться.
  const earliest = new Date(now.getTime() + schedule.minHoursBefore * 60 * 60 * 1000);

  for (let offset = 0; offset < schedule.horizonDays; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const scheduled = schedule.days[String(date.getDay())];
    if (!scheduled || scheduled.length === 0) continue;

    const dateKey = toDateKey(date);
    const busy = booked[dateKey] ?? [];

    const times = scheduled.filter((time) => {
      if (busy.includes(time)) return false;

      // Отсекаем слоты, до которых осталось меньше MIN_HOURS_BEFORE часов.
      const [hours, minutes] = time.split(':').map(Number);
      const slotDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
      return slotDate >= earliest;
    });

    if (times.length === 0) continue;

    days.push({
      date: dateKey,
      dayNumber: date.getDate(),
      monthShort: MONTHS_SHORT[date.getMonth()],
      weekdayShort: WEEKDAYS_SHORT[date.getDay()],
      times,
      isToday: dateKey === todayKey,
    });
  }

  return days;
}

/** Человекочитаемая дата для сводки: «14 сентября, понедельник». */
export function formatDateLong(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;

  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(date);
}
