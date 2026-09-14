/**
 * Эндпоинты Mini App специалиста (/api/admin/*).
 *
 * Доступ: заголовок `x-telegram-init-data` с initData из Telegram Mini App —
 * подпись проверяется, пользователь должен совпадать с PSYCHOLOGIST_CHAT_ID.
 * Для отладки в обычном браузере принимается `x-admin-token`, равный INTERNAL_API_TOKEN.
 */

import { buildBotDeepLink } from './config.js';
import { applyCors, header, isInternalRequestAllowed, parseBody, sendError } from './http.js';
import type { HttpRequestLike, HttpResponseLike } from './http.js';
import { cancellationForClient, cancelledLeadForPsychologist } from './messages.js';
import { normalizeSchedule } from './schedule.js';
import { cancelSession, getSchedule, getSession, listSessions, saveSchedule } from './sessions.js';
import { sessionStatus } from './store.js';
import { editPsychologistMessage, sendMessage } from './telegram.js';
import { isPsychologist, verifyInitData } from './telegramAuth.js';
import type { SessionRecord } from './types.js';

/** Проверяет CORS-preflight и права доступа. Возвращает true, если ответ уже отправлен. */
function guard(req: HttpRequestLike, res: HttpResponseLike): boolean {
  applyCors(res);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-internal-token, x-admin-token, x-telegram-init-data');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  // Основной путь: подпись Telegram Mini App.
  const initData = header(req, 'x-telegram-init-data');
  if (initData) {
    const user = verifyInitData(initData);
    if (user && isPsychologist(user)) return false;
    sendError(res, 403, 'Доступ только для специалиста');
    return true;
  }

  // Отладочный путь: служебный токен (только если он задан в окружении).
  const adminToken = header(req, 'x-admin-token');
  if (adminToken && isInternalRequestAllowed({ ...req, headers: { ...req.headers, 'x-internal-token': adminToken } })) {
    return false;
  }

  sendError(res, 401, 'Нужна авторизация через Telegram');
  return true;
}

/** Что отдаём в Mini App по каждой заявке (id + данные + вычисленный статус). */
function toAdminView(record: SessionRecord) {
  return {
    ...record,
    status: sessionStatus(record),
    telegramLink: buildBotDeepLink(record.id),
  };
}

/** Дата в формате YYYY-MM-DD или undefined. */
function dateParam(value: unknown): string | undefined {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

/**
 * GET /api/admin/bookings?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Записи с датой встречи в диапазоне (по умолчанию — от сегодня на 60 дней).
 */
export async function handleAdminBookings(
  query: Record<string, unknown>,
  req: HttpRequestLike,
  res: HttpResponseLike,
): Promise<void> {
  if (guard(req, res)) return;
  if (req.method !== 'GET') {
    sendError(res, 405, 'Метод не поддерживается');
    return;
  }

  const from = dateParam(query.from);
  const to = dateParam(query.to);
  const sessions = await listSessions({ ...(from ? { from } : {}), ...(to ? { to } : {}) });
  res.status(200).json({ sessions: sessions.map(toAdminView) });
}

/**
 * GET /api/admin/inbox
 * Обращения без выбранного времени («связаться в Telegram»).
 */
export async function handleAdminInbox(req: HttpRequestLike, res: HttpResponseLike): Promise<void> {
  if (guard(req, res)) return;
  if (req.method !== 'GET') {
    sendError(res, 405, 'Метод не поддерживается');
    return;
  }

  const sessions = await listSessions({ withoutSlot: true });
  // Свежие сверху.
  sessions.sort((a, b) => b.createdAt - a.createdAt);
  res.status(200).json({ sessions: sessions.map(toAdminView) });
}

/**
 * POST /api/admin/cancel  { id }
 * Отменяет запись: освобождает слот, правит карточку у специалиста и предупреждает клиента.
 */
export async function handleAdminCancel(req: HttpRequestLike, res: HttpResponseLike): Promise<void> {
  if (guard(req, res)) return;
  if (req.method !== 'POST') {
    sendError(res, 405, 'Метод не поддерживается');
    return;
  }

  const body = parseBody(req);
  const id = typeof body.id === 'string' ? body.id : '';
  const before = await getSession(id);
  if (!before) {
    sendError(res, 404, 'Заявка не найдена');
    return;
  }

  const wasCancelled = sessionStatus(before) === 'cancelled';
  const session = await cancelSession(id);
  if (!session) {
    sendError(res, 404, 'Заявка не найдена');
    return;
  }

  if (!wasCancelled) {
    // Карточка у специалиста — статус «отменено».
    if (session.psychologistMessageId !== undefined) {
      await editPsychologistMessage(session.psychologistMessageId, cancelledLeadForPsychologist(session));
    }
    // Клиенту — только если он подтверждал заявку в боте (иначе chat_id неизвестен).
    if (session.client) {
      try {
        await sendMessage(session.client.chatId, cancellationForClient(session));
      } catch (error) {
        console.error('[admin] Не удалось уведомить клиента об отмене:', error);
      }
    }
  }

  res.status(200).json({ session: toAdminView(session) });
}

/**
 * GET  /api/admin/schedule — текущее расписание.
 * PUT  /api/admin/schedule — сохранить новое.
 */
export async function handleAdminSchedule(req: HttpRequestLike, res: HttpResponseLike): Promise<void> {
  if (guard(req, res)) return;

  if (req.method === 'GET') {
    res.status(200).json({ schedule: await getSchedule() });
    return;
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    const schedule = normalizeSchedule(parseBody(req).schedule);
    if (!schedule) {
      sendError(res, 400, 'Некорректное расписание');
      return;
    }
    await saveSchedule(schedule);
    res.status(200).json({ schedule });
    return;
  }

  sendError(res, 405, 'Метод не поддерживается');
}
