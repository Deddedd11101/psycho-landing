/**
 * Long-polling для локальной разработки.
 *
 * На Vercel бот работает через вебхук, но на localhost вебхук недоступен
 * (Telegram не достучится до вашей машины), поэтому в dev-режиме мы сами
 * периодически спрашиваем у Telegram новые сообщения методом getUpdates.
 */

import { handleUpdate, type TelegramUpdate } from './bot.js';
import { localSessionApi, type SessionApi } from './sessionApi.js';
import { callTelegram, TelegramError } from './telegram.js';

export interface PollingOptions {
  /** Откуда бот берёт заявки: напрямую из хранилища или по HTTP. */
  api?: SessionApi;
  /** Таймаут long-polling в секундах (Telegram держит соединение до появления апдейта). */
  timeoutSeconds?: number;
}

/** Управление запущенным поллером. */
export interface PollingHandle {
  stop(): void;
}

/**
 * Запускает цикл получения апдейтов. Возвращает объект с методом stop().
 * Функция не блокирует поток: цикл живёт в отдельном промисе.
 */
export function startPolling(options: PollingOptions = {}): PollingHandle {
  const api = options.api ?? localSessionApi;
  const timeout = options.timeoutSeconds ?? 30;

  let stopped = false;
  // Смещение: id последнего обработанного апдейта + 1.
  let offset = 0;

  async function loop(): Promise<void> {
    // Убираем вебхук: одновременно с getUpdates он работать не может.
    try {
      await callTelegram('deleteWebhook', { drop_pending_updates: false });
    } catch (error) {
      console.warn('[polling] Не удалось снять вебхук:', (error as Error).message);
    }

    console.log('[polling] Бот запущен и слушает сообщения');

    while (!stopped) {
      try {
        const updates = await callTelegram<TelegramUpdate[]>('getUpdates', {
          offset,
          timeout,
          allowed_updates: ['message'],
        });

        for (const update of updates) {
          offset = update.update_id + 1;
          await handleUpdate(update, api);
        }
      } catch (error) {
        if (stopped) break;

        // 409 — параллельно запущен второй экземпляр бота или включён вебхук.
        if (error instanceof TelegramError && error.errorCode === 409) {
          console.error('[polling] Конфликт: бот уже запущен где-то ещё. Остановите второй экземпляр.');
        } else {
          console.error('[polling] Ошибка получения апдейтов:', (error as Error).message);
        }

        // Пауза перед повтором, чтобы не долбить API в цикле при сетевом сбое.
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    console.log('[polling] Бот остановлен');
  }

  void loop();

  return {
    stop() {
      stopped = true;
    },
  };
}
