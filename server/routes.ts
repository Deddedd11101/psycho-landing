/**
 * Обработчики HTTP-эндпоинтов, не зависящие от фреймворка.
 * Их переиспользуют и serverless-функции в /api, и Express-сервер в /backend —
 * благодаря этому логика не дублируется и ведёт себя одинаково везде.
 */

import { handleUpdate, type TelegramUpdate } from './bot.js';
import { config, missingTelegramConfig } from './config.js';
import { applyCors, header, isInternalRequestAllowed, parseBody, sendError } from './http.js';
import type { HttpRequestLike, HttpResponseLike } from './http.js';
import { attachClient, createSession, getSession } from './sessions.js';
import { validateSubmitRequest } from './validation.js';
import type { TelegramClient } from './types.js';

/**
 * Обрабатывает preflight-запрос CORS.
 * Возвращает true, если запрос уже полностью обработан и дальше идти не нужно.
 */
function handlePreflight(req: HttpRequestLike, res: HttpResponseLike): boolean {
  applyCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

/**
 * POST /api/submit-form
 * Принимает анкету, создаёт заявку и возвращает ссылку на бота для подтверждения.
 */
export async function handleSubmitForm(req: HttpRequestLike, res: HttpResponseLike): Promise<void> {
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    sendError(res, 405, 'Метод не поддерживается');
    return;
  }

  const validation = validateSubmitRequest(parseBody(req));
  if (!validation.ok) {
    sendError(res, 400, 'Проверьте заполнение формы', validation.errors);
    return;
  }

  // Без токена бота заявку принять можно, но подтверждение работать не будет —
  // честно сообщаем об этом, чтобы проблему заметили на этапе настройки.
  const missing = missingTelegramConfig();
  if (missing.length > 0) {
    console.error(`[api] Не заданы переменные окружения: ${missing.join(', ')}`);
    sendError(res, 500, 'Сервис записи временно недоступен. Попробуйте написать психологу напрямую.');
    return;
  }

  try {
    const result = await createSession(validation.value);
    res.status(200).json(result);
  } catch (error) {
    console.error('[api] Не удалось создать заявку:', error);
    sendError(res, 500, 'Не удалось отправить заявку. Попробуйте ещё раз или напишите психологу напрямую.');
  }
}

/**
 * GET /api/session/:id
 * Служебный эндпоинт: используется ботом, запущенным отдельным процессом.
 * Закрыт заголовком x-internal-token (если INTERNAL_API_TOKEN задан).
 */
export async function handleGetSession(
  sessionId: string,
  req: HttpRequestLike,
  res: HttpResponseLike,
): Promise<void> {
  if (handlePreflight(req, res)) return;

  if (req.method !== 'GET') {
    sendError(res, 405, 'Метод не поддерживается');
    return;
  }

  if (!isInternalRequestAllowed(req)) {
    sendError(res, 401, 'Недостаточно прав');
    return;
  }

  const session = await getSession(sessionId);
  if (!session) {
    sendError(res, 404, 'Заявка не найдена или срок её хранения истёк');
    return;
  }

  res.status(200).json(session);
}

/**
 * POST /api/booking
 * Привязывает Telegram-аккаунт клиента к заявке. Вызывается ботом.
 * Тело: { sessionId: string, client: { chatId, username?, firstName?, lastName? } }
 */
export async function handleBooking(req: HttpRequestLike, res: HttpResponseLike): Promise<void> {
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    sendError(res, 405, 'Метод не поддерживается');
    return;
  }

  if (!isInternalRequestAllowed(req)) {
    sendError(res, 401, 'Недостаточно прав');
    return;
  }

  const body = parseBody(req);
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  const client = body.client as TelegramClient | undefined;

  if (!sessionId || !client || typeof client.chatId !== 'number') {
    sendError(res, 400, 'Нужны sessionId и client.chatId');
    return;
  }

  const result = await attachClient(sessionId, client);
  if (!result) {
    sendError(res, 404, 'Заявка не найдена или срок её хранения истёк');
    return;
  }

  res.status(200).json(result);
}

/**
 * POST /api/telegram/webhook
 * Точка входа для апдейтов Telegram в продакшне (Vercel).
 * Всегда отвечает 200: иначе Telegram будет повторять доставку одного и того же апдейта.
 */
export async function handleTelegramWebhook(req: HttpRequestLike, res: HttpResponseLike): Promise<void> {
  if (req.method !== 'POST') {
    sendError(res, 405, 'Метод не поддерживается');
    return;
  }

  // Секрет задаётся при установке вебхука и приходит в заголовке — защита от подделки апдейтов.
  if (config.webhookSecret && header(req, 'x-telegram-bot-api-secret-token') !== config.webhookSecret) {
    sendError(res, 401, 'Неверный секрет вебхука');
    return;
  }

  const update = parseBody(req) as unknown as TelegramUpdate;
  await handleUpdate(update);

  res.status(200).json({ ok: true });
}
