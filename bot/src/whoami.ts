/**
 * Утилита: показать chat_id всех, кто писал боту.
 *
 * Нужна один раз при настройке — чтобы узнать PSYCHOLOGIST_CHAT_ID.
 *
 * Как пользоваться:
 *   1. Специалист открывает бота в Telegram и нажимает «Start».
 *   2. Выполните: npm run bot:whoami
 *   3. Скопируйте показанный chat_id в .env (PSYCHOLOGIST_CHAT_ID).
 *
 * Важно: команда читает апдейты, но не «съедает» их (offset не сдвигается),
 * поэтому её можно запускать сколько угодно раз. Если бот работает через вебхук,
 * getUpdates вернёт ошибку — сначала выполните npm run bot:delete-webhook.
 */

// Переменные окружения должны загрузиться до импорта config.
import '../../server/loadEnv.js';

import { config } from '../../server/config.js';
import { callTelegram } from '../../server/telegram.js';

interface UpdateWithChat {
  message?: {
    chat: { id: number; type: string };
    from?: { id: number; username?: string; first_name?: string; last_name?: string };
  };
}

async function main(): Promise<void> {
  if (!config.botToken) {
    console.error('Не задан BOT_TOKEN — заполните .env по образцу .env.example.');
    process.exit(1);
  }

  const updates = await callTelegram<UpdateWithChat[]>('getUpdates', { limit: 100, timeout: 0 });

  if (updates.length === 0) {
    console.log('Боту пока никто не писал.');
    console.log(`Откройте https://t.me/${config.botUsername}, нажмите «Start» и запустите команду снова.`);
    return;
  }

  // Один человек мог написать несколько раз — показываем каждого один раз.
  const seen = new Map<number, string>();

  for (const update of updates) {
    const message = update.message;
    if (!message || message.chat.type !== 'private') continue;

    const from = message.from;
    const name = [from?.first_name, from?.last_name].filter(Boolean).join(' ') || 'без имени';
    const username = from?.username ? ` (@${from.username})` : '';
    seen.set(message.chat.id, `${name}${username}`);
  }

  console.log('Кто писал боту:\n');
  for (const [chatId, name] of seen) {
    console.log(`  ${name}\n  PSYCHOLOGIST_CHAT_ID=${chatId}\n`);
  }
  console.log('Скопируйте нужный chat_id в .env.');
}

main().catch((error: unknown) => {
  console.error('Ошибка:', error instanceof Error ? error.message : error);
  process.exit(1);
});
