/**
 * Утилита настройки вебхука Telegram.
 *
 * Использование:
 *   npm run bot:set-webhook                 — установить вебхук на PUBLIC_URL
 *   npm run bot:set-webhook -- --delete     — удалить вебхук (вернуться к long-polling)
 *
 * Вебхук нужен в продакшне на Vercel: serverless-функции не могут «висеть»
 * в цикле getUpdates, поэтому Telegram сам присылает апдейты на наш адрес.
 */

// Переменные окружения должны загрузиться до импорта config.ts.
import '../../server/loadEnv.js';

import { config, missingTelegramConfig } from '../../server/config.js';
import { callTelegram } from '../../server/telegram.js';

async function main(): Promise<void> {
  const missing = missingTelegramConfig();
  if (missing.length > 0) {
    console.error(`Не заданы переменные окружения: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Удаление вебхука — например, чтобы временно вернуться к локальной разработке.
  if (process.argv.includes('--delete')) {
    await callTelegram('deleteWebhook', { drop_pending_updates: false });
    console.log('✅ Вебхук удалён. Теперь можно запускать бота в режиме long-polling.');
    return;
  }

  const baseUrl = (process.env.WEBHOOK_BASE_URL ?? config.publicUrl).replace(/\/$/, '');

  if (baseUrl.startsWith('http://localhost') || baseUrl.startsWith('http://127.')) {
    console.error('❌ Нельзя установить вебхук на localhost — Telegram до него не достучится.');
    console.error('   Укажите публичный адрес в PUBLIC_URL (или WEBHOOK_BASE_URL), например https://my-site.vercel.app');
    process.exit(1);
  }

  const url = `${baseUrl}/api/telegram/webhook`;

  await callTelegram('setWebhook', {
    url,
    allowed_updates: ['message'],
    // Секрет придёт обратно в заголовке X-Telegram-Bot-Api-Secret-Token — так мы
    // убедимся, что запрос действительно от Telegram.
    ...(config.webhookSecret ? { secret_token: config.webhookSecret } : {}),
  });

  console.log(`✅ Вебхук установлен: ${url}`);
  if (!config.webhookSecret) {
    console.warn('⚠ TELEGRAM_WEBHOOK_SECRET не задан — эндпоинт вебхука никак не защищён.');
  }

  const info = await callTelegram<Record<string, unknown>>('getWebhookInfo', {});
  console.log('Информация от Telegram:', info);
}

main().catch((error: unknown) => {
  console.error('❌ Ошибка:', error instanceof Error ? error.message : error);
  process.exit(1);
});
