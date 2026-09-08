/**
 * Выбор даты, времени и формата встречи.
 *
 * Расписание статичное (см. utils/slots.ts): лента ближайших доступных дней,
 * под ней — свободное время выбранного дня.
 */

import { useMemo } from 'react';

import { FORMAT_LABELS } from '@shared/topics';

import type { SessionFormat, WizardData } from '../../types';
import { getAvailableDays } from '../../utils/slots';
import { OptionCard } from './fields';

interface BookingCalendarProps {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}

export function BookingCalendar({ data, onChange }: BookingCalendarProps) {
  // Список дней считаем один раз за монтирование: он зависит только от текущего времени.
  const days = useMemo(() => getAvailableDays(), []);

  const selectedDay = days.find((day) => day.date === data.bookingDate);

  return (
    <div className="step">
      <h3 className="step__title">Выберите время</h3>
      <p className="step__hint">
        Встреча длится 60 минут. Время указано московское. Если удобного слота нет — напишите, подберём индивидуально.
      </p>

      {days.length === 0 ? (
        <p className="calendar__empty">
          Свободных слотов на ближайшие две недели нет. Напишите психологу в Telegram — подберём время вручную.
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
                  hint={value === 'online' ? 'Ссылку пришлю в Telegram перед встречей' : 'Ростов-на-Дону, точный адрес пришлю в чат'}
                  checked={data.format === value}
                  onChange={(selected) => onChange({ format: selected as SessionFormat })}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
