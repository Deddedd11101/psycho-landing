/**
 * Экраны Mini App: «Записи» (по дням), «Обращения» и «Расписание».
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { ALL_TIMES } from '@shared/schedule';
import type { ScheduleSettings } from '@shared/types';

import { fetchBookings, fetchInbox, fetchSchedule, saveSchedule, type AdminSession } from './api';
import { addDays, formatDayTitle, toDateKey, WEEKDAYS } from './format';
import { SessionCard } from './SessionCard';
import { alertDialog, haptic } from './telegram';

/** Состояние загрузки списка. */
type Loadable<T> = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; data: T };

/** Загружает данные при монтировании и по запросу. */
function useLoadable<T>(loader: () => Promise<T>): [Loadable<T>, () => void, (data: T) => void] {
  const [value, setValue] = useState<Loadable<T>>({ state: 'loading' });

  const reload = useCallback(() => {
    setValue({ state: 'loading' });
    loader()
      .then((data) => setValue({ state: 'ready', data }))
      .catch((error: unknown) =>
        setValue({ state: 'error', message: error instanceof Error ? error.message : 'Ошибка загрузки' }),
      );
  }, [loader]);

  useEffect(reload, [reload]);

  const setData = useCallback((data: T) => setValue({ state: 'ready', data }), []);
  return [value, reload, setData];
}

/* ------------------------------------------------------------------ */
/* Записи                                                              */
/* ------------------------------------------------------------------ */

/** Сколько дней вперёд показываем. */
const DAYS_AHEAD = 60;
/** Сколько дней назад доступны в разделе «прошедшие». */
const DAYS_BACK = 30;

export function BookingsView() {
  const today = toDateKey(new Date());
  const [showPast, setShowPast] = useState(false);

  const loader = useCallback(
    () => fetchBookings(toDateKey(addDays(new Date(), -DAYS_BACK)), toDateKey(addDays(new Date(), DAYS_AHEAD))),
    [],
  );
  const [bookings, reload, setBookings] = useLoadable(loader);

  // Группируем по дате; внутри дня — по времени.
  const groups = useMemo(() => {
    if (bookings.state !== 'ready') return [];
    const byDate = new Map<string, AdminSession[]>();
    for (const session of bookings.data) {
      if (!session.slot) continue;
      (byDate.get(session.slot.date) ?? byDate.set(session.slot.date, []).get(session.slot.date))!.push(session);
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => (a.slot?.time ?? '').localeCompare(b.slot?.time ?? '')),
      }));
  }, [bookings]);

  const upcoming = groups.filter((group) => group.date >= today);
  const past = groups.filter((group) => group.date < today).reverse();

  function handleChanged(updated: AdminSession): void {
    if (bookings.state !== 'ready') return;
    setBookings(bookings.data.map((item) => (item.id === updated.id ? updated : item)));
  }

  if (bookings.state === 'loading') return <p className="empty">Загружаем записи…</p>;
  if (bookings.state === 'error') return <ErrorBox message={bookings.message} onRetry={reload} />;

  return (
    <div className="view">
      <div className="view__toolbar">
        <span className="view__count">
          {countActive(upcoming)} {plural(countActive(upcoming), 'запись', 'записи', 'записей')} впереди
        </span>
        <button type="button" className="btn btn--ghost" onClick={reload}>
          Обновить
        </button>
      </div>

      {upcoming.length === 0 && <p className="empty">Впереди записей нет. Как только кто-то запишется — появится здесь.</p>}

      {upcoming.map((group) => (
        <section className="day" key={group.date}>
          <h2 className={`day__title${group.date === today ? ' day__title--today' : ''}`}>
            {formatDayTitle(group.date, today)}
          </h2>
          {group.items.map((session) => (
            <SessionCard key={session.id} session={session} onChanged={handleChanged} />
          ))}
        </section>
      ))}

      {past.length > 0 && (
        <section className="day">
          <button type="button" className="btn btn--ghost" onClick={() => setShowPast((value) => !value)}>
            {showPast ? 'Скрыть прошедшие' : `Прошедшие (${past.reduce((sum, group) => sum + group.items.length, 0)})`}
          </button>
          {showPast &&
            past.map((group) => (
              <div key={group.date}>
                <h2 className="day__title day__title--past">{formatDayTitle(group.date, today)}</h2>
                {group.items.map((session) => (
                  <SessionCard key={session.id} session={session} onChanged={handleChanged} />
                ))}
              </div>
            ))}
        </section>
      )}
    </div>
  );
}

function countActive(groups: { items: AdminSession[] }[]): number {
  return groups.reduce((sum, group) => sum + group.items.filter((item) => item.status !== 'cancelled').length, 0);
}

function plural(n: number, one: string, few: string, many: string): string {
  const lastTwo = n % 100;
  const last = n % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

/* ------------------------------------------------------------------ */
/* Обращения                                                           */
/* ------------------------------------------------------------------ */

export function InboxView() {
  const [inbox, reload, setInbox] = useLoadable(fetchInbox);

  function handleChanged(updated: AdminSession): void {
    if (inbox.state !== 'ready') return;
    setInbox(inbox.data.map((item) => (item.id === updated.id ? updated : item)));
  }

  if (inbox.state === 'loading') return <p className="empty">Загружаем обращения…</p>;
  if (inbox.state === 'error') return <ErrorBox message={inbox.message} onRetry={reload} />;

  const active = inbox.data.filter((item) => item.status !== 'cancelled');
  const closed = inbox.data.filter((item) => item.status === 'cancelled');

  return (
    <div className="view">
      <div className="view__toolbar">
        <span className="view__count">Клиенты, которые выбрали «написать» без записи на время</span>
        <button type="button" className="btn btn--ghost" onClick={reload}>
          Обновить
        </button>
      </div>

      {active.length === 0 && <p className="empty">Новых обращений нет.</p>}
      {active.map((session) => (
        <SessionCard key={session.id} session={session} onChanged={handleChanged} />
      ))}

      {closed.length > 0 && (
        <section className="day">
          <h2 className="day__title day__title--past">Закрытые</h2>
          {closed.map((session) => (
            <SessionCard key={session.id} session={session} onChanged={handleChanged} />
          ))}
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Расписание                                                          */
/* ------------------------------------------------------------------ */

export function ScheduleView() {
  const [loaded, reload] = useLoadable(fetchSchedule);
  const [draft, setDraft] = useState<ScheduleSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Черновик заполняем один раз после загрузки.
  useEffect(() => {
    if (loaded.state === 'ready' && draft === null) setDraft(loaded.data);
  }, [loaded, draft]);

  if (loaded.state === 'loading' || draft === null) {
    if (loaded.state === 'error') return <ErrorBox message={loaded.message} onRetry={reload} />;
    return <p className="empty">Загружаем расписание…</p>;
  }

  function toggleTime(day: string, time: string): void {
    setDraft((current) => {
      if (!current) return current;
      const times = new Set(current.days[day] ?? []);
      if (times.has(time)) {
        times.delete(time);
      } else {
        times.add(time);
      }
      const days = { ...current.days };
      if (times.size > 0) {
        days[day] = [...times].sort();
      } else {
        delete days[day];
      }
      return { ...current, days };
    });
    setSavedAt(null);
  }

  function setNumber(key: 'horizonDays' | 'minHoursBefore', value: number): void {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
    setSavedAt(null);
  }

  async function handleSave(): Promise<void> {
    if (!draft) return;
    setSaving(true);
    try {
      const saved = await saveSchedule(draft);
      setDraft(saved);
      setSavedAt(Date.now());
      haptic('success');
    } catch (error) {
      haptic('error');
      alertDialog(error instanceof Error ? error.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="view">
      <p className="hint">
        Отметьте часы, в которые готовы проводить онлайн-знакомства (20 минут). Клиент видит на сайте только эти
        слоты — минус уже занятые.
      </p>

      {WEEKDAYS.map((weekday) => {
        const times = draft.days[weekday.key] ?? [];
        return (
          <section className="schedule-day" key={weekday.key}>
            <div className="schedule-day__head">
              <span className="schedule-day__name">{weekday.label}</span>
              <span className="schedule-day__summary">{times.length > 0 ? `${times.length} ч.` : 'выходной'}</span>
            </div>
            <div className="chips">
              {ALL_TIMES.map((time) => (
                <button
                  type="button"
                  key={time}
                  className={`chip${times.includes(time) ? ' chip--on' : ''}`}
                  aria-pressed={times.includes(time)}
                  onClick={() => toggleTime(weekday.key, time)}
                >
                  {time}
                </button>
              ))}
            </div>
          </section>
        );
      })}

      <section className="schedule-day">
        <label className="row">
          <span>Открыть запись на</span>
          <select value={draft.horizonDays} onChange={(event) => setNumber('horizonDays', Number(event.target.value))}>
            {[7, 14, 21, 30, 45, 60].map((days) => (
              <option key={days} value={days}>
                {days} дней
              </option>
            ))}
          </select>
        </label>
        <label className="row">
          <span>Закрывать запись за</span>
          <select
            value={draft.minHoursBefore}
            onChange={(event) => setNumber('minHoursBefore', Number(event.target.value))}
          >
            {[0, 2, 6, 12, 24, 48].map((hours) => (
              <option key={hours} value={hours}>
                {hours === 0 ? 'не закрывать' : `${hours} ч. до встречи`}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="save-bar">
        <button type="button" className="btn btn--primary btn--block" disabled={saving} onClick={() => void handleSave()}>
          {saving ? 'Сохраняем…' : savedAt ? 'Сохранено ✓' : 'Сохранить расписание'}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="empty empty--error">
      <p>{message}</p>
      <button type="button" className="btn btn--ghost" onClick={onRetry}>
        Повторить
      </button>
    </div>
  );
}
