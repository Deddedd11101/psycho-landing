/**
 * Запуск Telegram-бота отдельным процессом (long-polling).
 *
 * Когда это нужно:
 *  - вы хотите держать бота отдельно от веб-сервера;
 *  - сайт задеплоен (например, на Vercel), а бота удобнее запускать у себя.
 *
 * Как бот находит заявки:
 *  - если задан API_BASE_URL — бот ходит в API по HTTP (единственный корректный
 *    вариант, когда сайт и бот работают в разных процессах);
 *  - иначе — читает хранилище напрямую. Это имеет смысл только при общем
 *    хранилище (Upstash Redis), потому что память у процессов разная.
 *
 * Для локальной разработки проще запускать `npm run dev` в корне: там бот
 * поднимается внутри Express-сервера и видит те же заявки без всякого HTTP.
 */

// Переменные окружения должны загрузиться до импорта config.ts.
import '../../server/loadEnv.js';

import { config, missingTelegramConfig } from '../../server/config.js';
import { startPolling } from '../../server/polling.js';
import { HttpSessionApi, localSessionApi, type SessionApi } from '../../server/sessionApi.js';
import { sessionStore } from '../../server/store.js';

const missing = missingTelegramConfig();
if (missing.length > 0) {
  console.error(`[bot] Не заданы переменные окружения: ${missing.join(', ')}`);
  console.error('[bot] Заполните .env по образцу .env.example и запустите снова.');
  process.exit(1);
}

const apiBaseUrl = process.env.API_BASE_URL?.trim();

let api: SessionApi;
if (apiBaseUrl) {
  api = new HttpSessionApi(apiBaseUrl, config.internalApiToken);
  console.log(`[bot] Заявки читаются через API: ${apiBaseUrl}`);
} else {
  api = localSessionApi;
  console.log(`[bot] Заявки читаются напрямую из хранилища (${sessionStore.kind})`);
  if (sessionStore.kind === 'memory') {
    console.warn(
      '[bot] ⚠ Хранилище — память этого процесса. Заявки с сайта здесь не появятся.\n' +
        '      Задайте API_BASE_URL (адрес сайта) или подключите Upstash Redis.',
    );
  }
}

const polling = startPolling({ api });

/** Аккуратная остановка по Ctrl+C, чтобы Telegram не считал бота «подвисшим». */
function shutdown(signal: string): void {
  console.log(`\n[bot] Получен ${signal}, останавливаюсь...`);
  polling.stop();
  // Даём циклу завершить текущий запрос getUpdates.
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
