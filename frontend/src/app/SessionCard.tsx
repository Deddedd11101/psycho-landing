/**
 * Карточка заявки в Mini App: кто, когда, с чем; действия «Написать» и «Отменить».
 * Используется и в списке записей, и в обращениях (там нет даты и времени).
 */

import { useState } from 'react';

import { cancelBooking, type AdminSession } from './api';
import { clientChatLink, describeFormat, describePerson, describeTopics, formatDateTime, statusMeta } from './format';
import { alertDialog, confirmDialog, haptic, openChat } from './telegram';

interface SessionCardProps {
  session: AdminSession;
  /** Вызывается после успешной отмены — родитель обновляет список. */
  onChanged: (updated: AdminSession) => void;
}

export function SessionCard({ session, onChanged }: SessionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  const status = statusMeta(session.status);
  const chatLink = clientChatLink(session);
  const isCancelled = session.status === 'cancelled';

  async function handleCancel(): Promise<void> {
    const when = session.slot ? ` ${session.slot.time}` : '';
    const ok = await confirmDialog(`Отменить запись ${session.form.name}${when}? Клиент получит уведомление.`);
    if (!ok) return;

    setBusy(true);
    try {
      const updated = await cancelBooking(session.id);
      haptic('success');
      onChanged(updated);
    } catch (error) {
      haptic('error');
      alertDialog(error instanceof Error ? error.message : 'Не удалось отменить запись');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`card${isCancelled ? ' card--cancelled' : ''}`}>
      <button type="button" className="card__head" onClick={() => setExpanded((value) => !value)}>
        {session.slot && <span className="card__time">{session.slot.time}</span>}
        <span className="card__main">
          <span className="card__name">{session.form.name}</span>
          <span className="card__meta">
            {describePerson(session)}
            {session.slot ? ` · ${describeFormat(session)}` : ` · ${formatDateTime(session.createdAt)}`}
          </span>
        </span>
        <span className={`badge badge--${status.tone}`}>{status.label}</span>
      </button>

      {expanded && (
        <div className="card__body">
          <dl className="details">
            <dt>Направления</dt>
            <dd>{describeTopics(session)}</dd>
            {session.form.request && (
              <>
                <dt>Запрос</dt>
                <dd className="details__quote">«{session.form.request}»</dd>
              </>
            )}
            {session.form.phone && (
              <>
                <dt>Телефон</dt>
                <dd>
                  <a href={`tel:${session.form.phone.replace(/[^\d+]/g, '')}`}>{session.form.phone}</a>
                </dd>
              </>
            )}
            <dt>Telegram</dt>
            <dd>
              {session.client
                ? session.client.username
                  ? `@${session.client.username}`
                  : `id ${session.client.chatId}`
                : 'ещё не открыл(а) бота'}
            </dd>
            <dt>Заявка</dt>
            <dd>
              {formatDateTime(session.createdAt)} · <code>{session.id}</code>
            </dd>
          </dl>

          <div className="card__actions">
            {chatLink && (
              <button type="button" className="btn btn--primary" onClick={() => openChat(chatLink)}>
                Написать
              </button>
            )}
            {!isCancelled && (
              <button type="button" className="btn btn--danger" disabled={busy} onClick={() => void handleCancel()}>
                {busy ? 'Отменяем…' : session.slot ? 'Отменить запись' : 'Закрыть обращение'}
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
