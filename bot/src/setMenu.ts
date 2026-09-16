/**
 * Утилита: кнопка меню бота, открывающая кабинет специалиста (Mini App).
 *
 *   npm run bot:set-menu            — поставить кнопку «Кабинет» (только для чата специалиста)
 *   npm run bot:set-menu -- --reset — вернуть стандартное меню команд
 *
 * Telegram открывает Mini App только по HTTPS, поэтому PUBLIC_URL должен начинаться с https://.
 * Кнопка ставится персонально в чат специалиста (chat_id) — клиенты её не видят.
 */

// Переменные окружения должны загрузиться до импорта config.
import '../../server/loadEnv.js';

import { buildMiniAppUrl, config, missingTelegramConfig } from '../../server/config.js';
import { callTelegram } from '../../server/telegram.js';

async function main(): Promise<void> {
  const missing = missingTelegramConfig();
  if (missing.length > 0) {
    console.error(`Не заданы переменные окружения: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (process.argv.includes('--reset')) {
    await callTelegram('setChatMenuButton', {
      chat_id: Number(config.psychologistChatId),
      menu_button: { type: 'default' },
    });
    await callTelegram('deleteMyCommands', { scope: { type: 'chat', chat_id: Number(config.psychologistChatId) } });
    console.log('✅ Кнопка меню и команды сброшены на стандартные.');
    return;
  }

  const url = buildMiniAppUrl();
  if (!url) {
    console.error('❌ PUBLIC_URL должен начинаться с https:// — Telegram не открывает Mini App по http.');
    process.exit(1);
  }

  await callTelegram('setChatMenuButton', {
    chat_id: Number(config.psychologistChatId),
    menu_button: { type: 'web_app', text: 'Кабинет', web_app: { url } },
  });

  // Команды: клиентам — только /start, специалисту (в его чате) — ещё и /app.
  await callTelegram('setMyCommands', {
    commands: [{ command: 'start', description: 'Подтвердить запись' }],
  });
  await callTelegram('setMyCommands', {
    scope: { type: 'chat', chat_id: Number(config.psychologistChatId) },
    commands: [
      { command: 'start', description: 'Подтвердить запись' },
      { command: 'app', description: 'Кабинет: записи и расписание' },
    ],
  });

  console.log(`✅ Кнопка «Кабинет» установлена в чате специалиста: ${url}`);
}

main().catch((error: unknown) => {
  console.error('❌ Ошибка:', error instanceof Error ? error.message : error);
  process.exit(1);
});
