/**
 * Бизнес-логика работы с заявками (сессиями воронки).
 * Слой не знает ни про Express, ни про Vercel — его переиспользуют все точки входа.
 */

import { randomBytes } from 'node:crypto';

import { buildBotDeepLink, buildPsychologistLink } from './config.js';
import { newLeadForPsychologist } from './messages.js';
import { sessionStore, type BookedSlots } from './store.js';
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

/** Слот уже занят другим клиентом — просим выбрать другое время. */
export class SlotTakenError extends Error {
  constructor() {
    super('Это время только что заняли. Пожалуйста, выберите другое.');
    this.name = 'SlotTakenError';
  }
}

/** Возвращает занятые слоты — календарь на сайте показывает их недоступными. */
export async function getBookedSlots(): Promise<BookedSlots> {
  return sessionStore.getBookedSlots();
}

/**
 * Создаёт заявку по данным формы и сразу уведомляет психолога.
 *
 * Уведомление отправляется до перехода клиента в бота намеренно: если клиент
 * закроет вкладку и не нажмёт «Start», заявка всё равно дойдёт до специалиста.
 */
export async function createSession(payload: SubmitFormRequest): Promise<SubmitFormResponse> {
  // Слот занимаем сразу при отправке анкеты: иначе два человека успеют выбрать
  // одно и то же время, пока первый подтверждает заявку в боте.
  if (payload.slot) {
    const reserved = await sessionStore.reserveSlot(payload.slot.date, payload.slot.time);
    if (!reserved) throw new SlotTakenError();
  }

  const record: SessionRecord = {
    id: generateSessionId(),
    createdAt: Date.now(),
    intent: payload.intent,
    form: payload.form,
    ...(payload.slot ? { slot: payload.slot } : {}),
    psychologistNotified: false,
  };

  try {
    await sessionStore.set(record);
  } catch (error) {
    // Заявка не сохранилась — освобождаем слот, иначе он останется занятым впустую.
    if (payload.slot) await sessionStore.releaseSlot(payload.slot.date, payload.slot.time);
    throw error;
  }

  // Ошибка отправки не должна ломать пользовательский сценарий: заявка уже сохранена.
  // message_id запоминаем: при подтверждении карточка будет отредактирована, а не продублирована.
  const messageId = await sendToPsychologist(newLeadForPsychologist(record));
  if (messageId !== null) {
    record.psychologistNotified = true;
    record.psychologistMessageId = messageId;
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
