/**
 * Вспомогательные функции для HTTP-слоя.
 * Написаны так, чтобы подходить и Express, и serverless-функциям Vercel:
 * оба используют совместимые интерфейсы req/res из Node.
 */

import { config } from './config.js';

/** Минимальный контракт запроса, который нам нужен. */
export interface HttpRequestLike {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
}

/** Минимальный контракт ответа. */
export interface HttpResponseLike {
  status(code: number): HttpResponseLike;
  json(data: unknown): unknown;
  setHeader(name: string, value: string): unknown;
  end(data?: unknown): unknown;
}

/**
 * Разбирает тело запроса.
 * Vercel и express.json() уже отдают объект, но если пришла строка — парсим сами.
 */
export function parseBody(req: HttpRequestLike): Record<string, unknown> {
  const body = req.body;
  if (!body) return {};
  if (typeof body === 'object') return body as Record<string, unknown>;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

/** Читает заголовок в виде строки (Node может отдать массив). */
export function header(req: HttpRequestLike, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Проверяет служебный токен для внутренних эндпоинтов.
 * Если INTERNAL_API_TOKEN не задан (локальная разработка) — проверка пропускается.
 */
export function isInternalRequestAllowed(req: HttpRequestLike): boolean {
  if (!config.internalApiToken) return true;
  return header(req, 'x-internal-token') === config.internalApiToken;
}

/** Разрешает CORS: удобно, когда фронтенд и API живут на разных доменах. */
export function applyCors(res: HttpResponseLike): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-internal-token');
}

/** Отправляет ошибку в едином формате. */
export function sendError(
  res: HttpResponseLike,
  status: number,
  message: string,
  details?: Record<string, string>,
): void {
  res.status(status).json({ error: message, ...(details ? { details } : {}) });
}
