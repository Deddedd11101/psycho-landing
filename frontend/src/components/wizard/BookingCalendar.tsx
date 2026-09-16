/**
 * Выбор даты и времени встречи-знакомства. Знакомство всегда онлайн —
 * формат не спрашиваем (очные встречи обсуждаются уже на знакомстве).
 *
 * Сетка приёма задана в utils/slots.ts, а занятое время приходит с сервера
 * (GET /api/slots): если кто-то уже записался, этот слот в календаре не показывается.
 */

import { useEffect, useMemo } from 'react';

import type { WizardData } from '../../types';
import { getAvailableDays, type BookedSlots, type ScheduleSettings } from '../../utils/slots';

interface BookingCalendarProps {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
  /** Занятое время, полученное с сервера. */
  booked: BookedSlots;
  /** Рабочие часы специалиста; undefined — ещё не загружены (берём по умолчанию). */
  schedule?: ScheduleSettings;
  /** Идёт загрузка расписания. */
  isLoading: boolean;
  /** «Не нашли время — написать без записи». */
  onContactInstead: () => void;
}

export function BookingCalendar({ data, onChange, booked, schedule, isLoading, onContactInstead }: BookingCalendarProps) {
  // Пересчитываем список дней при каждом обновлении расписания или занятых слотов.
  const days = useMemo(() => getAvailableDays(booked, schedule), [booked, schedule]);

  const selectedDay = days.find((day) => day.date === data.bookingDate);

  // Если выбранное время успели занять, пока клиент заполнял анкету, — снимаем выбор.
  useEffect(() => {
    if (!data.bookingDate) return;

    const dayStillFree = days.find((day) => day.date === data.bookingDate);
    if (!dayStillFree) {
      onChange({ bookingDate: '', bookingTime: '' });
      return;
    }

    if (data.bookingTime && !dayStillFree.times.includes(data.bookingTime)) {
      onChange({ bookingTime: '' });
    }
  }, [days, data.bookingDate, data.bookingTime, onChange]);

  return (
    <div>
      <h3 className="step__title">Когда вам удобно?</h3>
      <p className="step__hint">
        Знакомство — 20 минут онлайн, ссылку на видеозвонок пришлю в Telegram. Время московское.
      </p>

      {isLoading ? (
        <p className="calendar__empty">Загружаем свободное время…</p>
      ) : days.length === 0 ? (
        <p className="calendar__empty">
          Свободного времени в ближайшие дни нет.{' '}
          <button type="button" className="link-button" onClick={onContactInstead}>
            Напишите
          </button>{' '}
          — подберём вручную.
        </p>
      ) : (
        <>
          <div className="calendar__group">
            <span className="calendar__label" id="calendar-date-label">
              Дата
            </span>
            <div className="calendar__days" role="group" aria-labelledby="calendar-date-label">
              {days.map((day) => (
                <button
                  key={day.date}
                  type="button"
                  className={`calendar__day${day.date === data.bookingDate ? ' calendar__day--selected' : ''}`}
                  aria-pressed={day.date === data.bookingDate}
                  // Смена даты сбрасывает время: в другом дне доступны другие слоты.
                  onClick={() => onChange({ bookingDate: day.date, bookingTime: '' })}
                >
                  <span className="calendar__day-weekday">{day.isToday ? 'сегодня' : day.weekdayShort}</span>
                  <span className="calendar__day-number">{day.dayNumber}</span>
                  <span className="calendar__day-month">{day.monthShort}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedDay && (
            <div className="calendar__group">
              <span className="calendar__label" id="calendar-time-label">
                Время
              </span>
              <div className="calendar__times" role="group" aria-labelledby="calendar-time-label">
                {selectedDay.times.map((time) => (
                  <button
                    key={time}
                    type="button"
                    className={`calendar__time${time === data.bookingTime ? ' calendar__time--selected' : ''}`}
                    aria-pressed={time === data.bookingTime}
                    onClick={() => onChange({ bookingTime: time })}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="calendar__alt">
            Нет подходящего времени?{' '}
            <button type="button" className="link-button" onClick={onContactInstead}>
              Напишите без записи
            </button>{' '}
            — подберём вместе.
          </p>
        </>
      )}
    </div>
  );
}
