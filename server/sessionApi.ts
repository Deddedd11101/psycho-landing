/**
 * Доступ бота к заявкам.
 *
 * Бот может работать в двух режимах, и им нужен разный способ достучаться до данных:
 *  - LocalSessionApi — бот запущен в одном процессе с API (Express-сервер локально
 *    или serverless-вебхук на Vercel): читаем хранилище напрямую;
 *  - HttpSessionApi — бот запущен отдельным процессом (npm run dev:bot или отдельный
 *    воркер): ходит в API по HTTP, чтобы видеть те же заявки, что и сайт.
 */

import { attachClient } from './sessions.js';
import type { SessionRecord, TelegramClient } from './types.js';

/** Результат привязки клиента к заявке. */
export interface AttachResult {
  session: SessionRecord;
  /** true — клиент уже подтверждал эту заявку раньше (значит, не шлём сообщения повторно). */
  alreadyConfirmed: boolean;
}

/** Интерфейс, от которого зависит обработчик апдейтов бота. */
export interface SessionApi {
  attach(sessionId: string, client: TelegramClient): Promise<AttachResult | null>;
}

/** Прямой доступ к хранилищу — когда бот и API живут в одном процессе. */
export const localSessionApi: SessionApi = {
  attach: (sessionId, client) => attachClient(sessionId, client),
};

/** Доступ к API по HTTP — когда бот запущен отдельно от сервера. */
export class HttpSessionApi implements SessionApi {
  constructor(
    private readonly baseUrl: string,
    private readonly internalToken?: string,
  ) {}

  async attach(sessionId: string, client: TelegramClient): Promise<AttachResult | null> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.internalToken ? { 'x-internal-token': this.internalToken } : {}),
      },
      body: JSON.stringify({ sessionId, client }),
    });

    // Заявки нет или срок истёк — это штатная ситуация, а не сбой.
    if (response.status === 404) return null;

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API вернул ${response.status}: ${text}`);
    }

    return (await response.json()) as AttachResult;
  }
}
