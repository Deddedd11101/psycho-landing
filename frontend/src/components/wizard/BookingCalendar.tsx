/**
 * Выбор даты, времени и формата встречи.
 *
 * Сетка приёма задана в utils/slots.ts, а занятое время приходит с сервера
 * (GET /api/slots): если кто-то уже записался, этот слот в календаре не показывается.
 */

import { useEffect, useMemo } from 'react';

import { FORMAT_LABELS } from '@shared/topics';

import type { SessionFormat, WizardData } from '../../types';
import { getAvailableDays, type BookedSlots, type ScheduleSettings } from '../../utils/slots';
import { OptionCard } from './fields';

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
      <p className="step__hint">Первая встреча — знакомство на 20 минут. Время московское, занятые слоты не показываются.</p>

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

          <div className="calendar__group">
            <span className="calendar__label" id="calendar-format-label">
              Формат встречи
            </span>
            <div className="options" role="radiogroup" aria-labelledby="calendar-format-label">
              {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                <OptionCard
                  key={value}
                  type="radio"
                  name="format"
                  value={value}
                  label={label}
                  hint={
                    value === 'online'
                      ? 'Ссылку пришлю в Telegram перед встречей'
                      : 'Ростов-на-Дону, ул. Станиславского — точный адрес пришлю в чат'
                  }
                  checked={data.format === value}
                  onChange={(selected) => onChange({ format: selected as SessionFormat })}
                />
              ))}
            </div>
          </div>

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
