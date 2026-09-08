/**
 * Бизнес-логика работы с заявками (сессиями воронки).
 * Слой не знает ни про Express, ни про Vercel — его переиспользуют все точки входа.
 */

import { randomBytes } from 'node:crypto';

import { buildBotDeepLink, buildPsychologistLink } from './config.js';
import { newLeadForPsychologist } from './messages.js';
import { sessionStore } from './store.js';
import { sendToPsychologist } from './telegram.js';
import type { SessionRecord, SubmitFormRequest, SubmitFormResponse, TelegramClient } from './types.js';

/**
 * Генерирует идентификатор заявки.
 * Только строчные латинские буквы и цифры — такой id безопасно передавать
 * в deep-link Telegram (?start=...), где разрешены [A-Za-z0-9_-].
 */
export function generateSessionId(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(16);
  let id = '';
  for (const byte of bytes) {
    id += alphabet[byte % alphabet.length];
  }
  return id;
}

/**
 * Создаёт заявку по данным формы и сразу уведомляет психолога.
 *
 * Уведомление отправляется до перехода клиента в бота намеренно: если клиент
 * закроет вкладку и не нажмёт «Start», заявка всё равно дойдёт до специалиста.
 */
export async function createSession(payload: SubmitFormRequest): Promise<SubmitFormResponse> {
  const record: SessionRecord = {
    id: generateSessionId(),
    createdAt: Date.now(),
    intent: payload.intent,
    form: payload.form,
    ...(payload.slot ? { slot: payload.slot } : {}),
    psychologistNotified: false,
  };

  await sessionStore.set(record);

  // Ошибка отправки не должна ломать пользовательский сценарий: заявка уже сохранена.
  const notified = await sendToPsychologist(newLeadForPsychologist(record));
  if (notified) {
    record.psychologistNotified = true;
    await sessionStore.set(record);
  }

  return {
    sessionId: record.id,
    telegramLink: buildBotDeepLink(record.id),
    psychologistLink: buildPsychologistLink(),
  };
}

/** Возвращает заявку по идентификатору (или null, если её нет / срок истёк). */
export async function getSession(id: string): Promise<SessionRecord | null> {
  if (!id || !/^[a-z0-9]{4,64}$/.test(id)) return null;
  return sessionStore.get(id);
}

/**
 * Привязывает Telegram-аккаунт клиента к заявке.
 * Возвращает:
 *  - обновлённую заявку и признак «подтверждена впервые» — чтобы не слать дубли сообщений;
 *  - null, если заявка не найдена.
 */
export async function attachClient(
  id: string,
  client: TelegramClient,
): Promise<{ session: SessionRecord; alreadyConfirmed: boolean } | null> {
  const session = await getSession(id);
  if (!session) return null;

  const alreadyConfirmed = Boolean(session.confirmedAt);

  session.client = client;
  if (!alreadyConfirmed) {
    session.confirmedAt = Date.now();
  }
  await sessionStore.set(session);

  return { session, alreadyConfirmed };
}
