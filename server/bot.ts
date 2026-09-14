/**
 * Логика Telegram-бота: обработка входящих апдейтов.
 *
 * Один и тот же обработчик используется и для вебхука (Vercel), и для long-polling
 * (локальная разработка) — меняется только способ доставки апдейтов.
 *
 * Сценарий:
 *  1. Клиент заполняет анкету на сайте → сервер создаёт заявку и отдаёт ссылку
 *     t.me/<bot>?start=<sessionId>.
 *  2. Клиент открывает ссылку и нажимает «Start» → Telegram присылает боту
 *     сообщение «/start <sessionId>» вместе с chat_id клиента.
 *  3. Бот привязывает chat_id к заявке, отправляет клиенту подтверждение,
 *     а психологу — полную анкету со ссылкой на клиента.
 */

import { buildMiniAppUrl, buildPsychologistLink, config } from './config.js';
import {
  confirmationForClient,
  confirmationPingForPsychologist,
  confirmedLeadForPsychologist,
  expiredSessionMessage,
  fallbackMessage,
  welcomeMessage,
} from './messages.js';
import { localSessionApi, type SessionApi } from './sessionApi.js';
import { editPsychologistMessage, sendMessage, sendToPsychologist } from './telegram.js';
import type { TelegramClient } from './types.js';

/** Минимальный набор полей апдейта, который нам нужен (полная схема Bot API гораздо шире). */
export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number; type: string };
    from?: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
      is_bot?: boolean;
    };
  };
}

/**
 * Обрабатывает один апдейт.
 * Никогда не выбрасывает исключение наружу: для вебхука важно всегда ответить 200,
 * иначе Telegram будет бесконечно повторять доставку.
 */
export async function handleUpdate(update: TelegramUpdate, api: SessionApi = localSessionApi): Promise<void> {
  try {
    const message = update.message;
    if (!message || message.chat.type !== 'private') return;

    const text = (message.text ?? '').trim();
    const from = message.from;
    if (!from || from.is_bot) return;

    const client: TelegramClient = {
      chatId: message.chat.id,
      ...(from.username ? { username: from.username } : {}),
      ...(from.first_name ? { firstName: from.first_name } : {}),
      ...(from.last_name ? { lastName: from.last_name } : {}),
    };

    if (text.startsWith('/start')) {
      // Параметр deep-link идёт через пробел: «/start abc123».
      const payload = text.slice('/start'.length).trim();
      // В лог — только идентификаторы, без содержимого анкеты: помогает найти chat_id при настройке.
      console.log(
        `[bot] /start от chat_id=${client.chatId}${client.username ? ` @${client.username}` : ''}` +
          (payload ? ` (заявка ${payload})` : ''),
      );
      if (payload) {
        await handleStartWithSession(payload, client, api);
      } else {
        await sendMessage(client.chatId, welcomeMessage());
      }
      return;
    }

    if (text === '/help') {
      await sendMessage(client.chatId, welcomeMessage());
      return;
    }

    // Кабинет специалиста — только для владельца (PSYCHOLOGIST_CHAT_ID).
    if (text === '/app') {
      await handleAppCommand(client);
      return;
    }

    await sendMessage(client.chatId, fallbackMessage());
  } catch (error) {
    console.error('[bot] Ошибка обработки апдейта:', error);
  }
}

/** Отвечает на /app: кнопка, открывающая Mini App с записями. */
async function handleAppCommand(client: TelegramClient): Promise<void> {
  if (String(client.chatId) !== config.psychologistChatId) {
    await sendMessage(client.chatId, fallbackMessage());
    return;
  }

  const url = buildMiniAppUrl();
  if (!url) {
    await sendMessage(
      client.chatId,
      'Кабинет с записями откроется, когда сайт будет работать по HTTPS — Telegram не открывает Mini App по http.',
    );
    return;
  }

  await sendMessage(client.chatId, '🗓 Записи, обращения и расписание — в кабинете:', [
    { text: 'Открыть кабинет', web_app: { url } },
  ]);
}

/** Обрабатывает /start с идентификатором заявки. */
async function handleStartWithSession(
  sessionId: string,
  client: TelegramClient,
  api: SessionApi,
): Promise<void> {
  let result: Awaited<ReturnType<SessionApi['attach']>> = null;

  try {
    result = await api.attach(sessionId, client);
  } catch (error) {
    console.error('[bot] Не удалось получить заявку:', error);
    await sendMessage(
      client.chatId,
      [
        '😔 Не получилось подтвердить заявку — похоже, сервис временно недоступен.',
        '',
        `Пожалуйста, напишите психологу напрямую: ${buildPsychologistLink()}`,
      ].join('\n'),
    );
    return;
  }

  // Ссылка устарела или заявка не найдена.
  if (!result) {
    await sendMessage(client.chatId, expiredSessionMessage());
    return;
  }

  const { session, alreadyConfirmed } = result;

  // Повторное нажатие «Start» по той же ссылке — просто повторяем подтверждение клиенту,
  // но психолога вторым уведомлением не беспокоим.
  await sendMessage(client.chatId, confirmationForClient(session), [
    { text: '💬 Написать психологу', url: buildPsychologistLink() },
  ]);

  if (alreadyConfirmed) return;

  const cardText = confirmedLeadForPsychologist(session);
  const cardButtons = session.client?.username
    ? [{ text: '💬 Открыть чат с клиентом', url: `https://t.me/${session.client.username}` }]
    : undefined;

  // Карточку заявки редактируем на месте, чтобы в чате психолога не копились дубли.
  // Если исходное сообщение не сохранилось или удалено — отправляем новое.
  const edited =
    session.psychologistMessageId !== undefined &&
    (await editPsychologistMessage(session.psychologistMessageId, cardText, cardButtons));

  if (!edited) {
    await sendToPsychologist(cardText, cardButtons);
    return;
  }

  // Редактирование не вызывает уведомления — шлём короткий ответ на карточку.
  await sendToPsychologist(confirmationPingForPsychologist(session), undefined, {
    replyTo: session.psychologistMessageId,
  });
}
