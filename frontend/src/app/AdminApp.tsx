/**
 * Mini App специалиста: три вкладки — записи, обращения, расписание.
 * Открывается из Telegram (кнопка меню бота) или в браузере по /app?token=... для отладки.
 */

import { useEffect, useState } from 'react';

import { getWebApp, initTelegram } from './telegram';
import { BookingsView, InboxView, ScheduleView } from './views';

type Tab = 'bookings' | 'inbox' | 'schedule';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'bookings', label: 'Записи', icon: '🗓' },
  { key: 'inbox', label: 'Обращения', icon: '💬' },
  { key: 'schedule', label: 'Расписание', icon: '⚙️' },
];

export function AdminApp() {
  const [tab, setTab] = useState<Tab>('bookings');
  const hasAuth = Boolean(getWebApp()) || new URLSearchParams(window.location.search).has('token');

  useEffect(() => {
    initTelegram();
  }, []);

  if (!hasAuth) {
    return (
      <div className="shell">
        <p className="empty">
          Эта страница открывается из Telegram — через кнопку меню в боте записи. В браузере она недоступна.
        </p>
      </div>
    );
  }

  return (
    <div className="shell">
      <main className="content">
        {tab === 'bookings' && <BookingsView />}
        {tab === 'inbox' && <InboxView />}
        {tab === 'schedule' && <ScheduleView />}
      </main>

      <nav className="tabs" aria-label="Разделы">
        {TABS.map((item) => (
          <button
            type="button"
            key={item.key}
            className={`tabs__item${tab === item.key ? ' tabs__item--active' : ''}`}
            aria-current={tab === item.key ? 'page' : undefined}
            onClick={() => setTab(item.key)}
          >
            <span className="tabs__icon" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
