/**
 * Экраны результата воронки: успех (нужно подтвердить заявку в Telegram) и ошибка.
 *
 * Почему после отправки формы нужен переход в Telegram: чтобы бот смог написать
 * клиенту, у него должен быть chat_id, а получить его можно только когда человек
 * сам открыл диалог с ботом. Ссылка вида t.me/bot?start=<id> решает это в один клик.
 */

import { whatsappLink } from '../../data/content';
import type { Intent, SubmitFormResponse } from '../../types';

interface SuccessScreenProps {
  result: SubmitFormResponse;
  intent: Intent;
  /** Выбранные дата и время — показываем, если это запись. */
  slotLabel?: string;
  /** Имя из анкеты — подставляем в готовое сообщение для WhatsApp. */
  clientName: string;
  onClose: () => void;
}

export function SuccessScreen({ result, intent, slotLabel, clientName, onClose }: SuccessScreenProps) {
  const isBooking = intent === 'booking';
  // Готовый текст: специалист сразу видит, кто пишет и по какой заявке.
  const whatsapp = whatsappLink(
    isBooking && slotLabel
      ? `Здравствуйте! Меня зовут ${clientName}, я записался(лась) на сайте на встречу-знакомство: ${slotLabel}.`
      : `Здравствуйте! Меня зовут ${clientName}, я оставил(а) заявку на сайте — хочу обсудить консультацию.`,
  );

  return (
    <div className="result">
      <div className="result__icon" aria-hidden="true">
        ✅
      </div>
      <h3 className="result__title">Заявка отправлена!</h3>
      <p className="result__text">
        {isBooking && slotLabel ? (
          <>
            Заявка на <strong>{slotLabel}</strong> у психолога. Остался один шаг — подтвердите запись в Telegram,
            чтобы получить напоминание и ссылку на встречу.
          </>
        ) : (
          <>Заявка у психолога. Остался один шаг — откройте Telegram, чтобы он смог вам ответить.</>
        )}
      </p>

      <div className="result__steps">
        <div className="result__step">
          <span className="result__step-number">1</span>
          <span>Нажмите кнопку ниже — откроется чат с ботом записи.</span>
        </div>
        <div className="result__step">
          <span className="result__step-number">2</span>
          <span>
            В чате нажмите <strong>«Start»</strong> (или «Начать»).
          </span>
        </div>
        <div className="result__step">
          <span className="result__step-number">3</span>
          <span>
            {isBooking
              ? 'Бот пришлёт подтверждение с датой, временем и ссылкой на встречу.'
              : 'Бот передаст ваш контакт психологу, и он напишет вам лично.'}
          </span>
        </div>
      </div>

      <div className="result__actions">
        <a className="button button--telegram button--block" href={result.telegramLink} target="_blank" rel="noreferrer">
          Открыть Telegram и подтвердить
        </a>
        <a
          className="button button--secondary button--block"
          href={result.psychologistLink}
          target="_blank"
          rel="noreferrer"
        >
          Написать психологу напрямую
        </a>
        {whatsapp && (
          <a className="button button--secondary button--block" href={whatsapp} target="_blank" rel="noreferrer">
            Нет Telegram — написать в WhatsApp
          </a>
        )}
      </div>

      <button type="button" className="button button--ghost button--block" style={{ marginTop: 12 }} onClick={onClose}>
        Закрыть
      </button>
    </div>
  );
}

interface ErrorScreenProps {
  message: string;
  psychologistLink: string;
  onRetry: () => void;
  onClose: () => void;
}

export function ErrorScreen({ message, psychologistLink, onRetry, onClose }: ErrorScreenProps) {
  return (
    <div className="result">
      <div className="result__icon result__icon--error" aria-hidden="true">
        😔
      </div>
      <h3 className="result__title">Не удалось отправить заявку</h3>
      <p className="result__text">{message}</p>

      <div className="result__actions">
        <button type="button" className="button button--primary button--block" onClick={onRetry}>
          Попробовать ещё раз
        </button>
        <a className="button button--telegram button--block" href={psychologistLink} target="_blank" rel="noreferrer">
          Написать в Telegram
        </a>
      </div>

      <button type="button" className="button button--ghost button--block" style={{ marginTop: 12 }} onClick={onClose}>
        Закрыть
      </button>
    </div>
  );
}
