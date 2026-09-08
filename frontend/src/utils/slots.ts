/**
 * Расписание приёма.
 *
 * Сетка рабочих часов задана здесь (SCHEDULE) — правьте её под реальный график.
 * Занятое время приходит с сервера (GET /api/slots) и передаётся в getAvailableDays:
 * слот, на который кто-то уже записался, из календаря пропадает.
 */

/** Рабочие часы по дням недели: 0 — воскресенье, 6 — суббота. */
const SCHEDULE: Record<number, string[]> = {
  1: ['10:00', '12:00', '15:00', '17:00', '19:00'], // понедельник
  2: ['10:00', '12:00', '15:00', '17:00', '19:00'], // вторник
  3: ['12:00', '15:00', '17:00', '19:00'], // среда
  4: ['10:00', '12:00', '15:00', '17:00', '19:00'], // четверг
  5: ['10:00', '12:00', '15:00'], // пятница
  6: ['11:00', '13:00'], // суббота
  // Воскресенье — выходной, поэтому ключа 0 нет.
};

/** Занятые слоты: дата YYYY-MM-DD -> список времени. Приходят с сервера (GET /api/slots). */
export type BookedSlots = Record<string, string[]>;

/** За сколько часов до встречи закрываем запись. */
const MIN_HOURS_BEFORE = 12;

/** Сколько дней вперёд показываем в календаре. */
const DAYS_AHEAD = 14;

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
 * Возвращает список дней со свободным временем на ближайшие две недели.
 * Занятое время (booked) исключается, дни без свободных слотов не показываются.
 */
export function getAvailableDays(booked: BookedSlots = {}, now: Date = new Date()): AvailableDay[] {
  const days: AvailableDay[] = [];
  const todayKey = toDateKey(now);
  // Ближайший момент, на который ещё можно записаться.
  const earliest = new Date(now.getTime() + MIN_HOURS_BEFORE * 60 * 60 * 1000);

  for (let offset = 0; offset < DAYS_AHEAD; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const scheduled = SCHEDULE[date.getDay()];
    if (!scheduled) continue;

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
