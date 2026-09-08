/**
 * Тонкая обёртка над Telegram Bot API.
 * Специально без внешних библиотек: нужны буквально три метода, а fetch есть в Node 18+.
 */

import { config } from './config.js';

/** Ошибка, с которой вернулся Telegram (например, «бот заблокирован пользователем»). */
export class TelegramError extends Error {
  constructor(
    message: string,
    readonly method: string,
    readonly errorCode?: number,
  ) {
    super(message);
    this.name = 'TelegramError';
  }
}

/** Кнопка-ссылка в inline-клавиатуре. */
export interface InlineButton {
  text: string;
  url: string;
}

/** Вызывает произвольный метод Bot API. */
export async function callTelegram<T>(method: string, payload: Record<string, unknown>): Promise<T> {
  if (!config.botToken) {
    throw new TelegramError('Не задана переменная окружения BOT_TOKEN', method);
  }

  const response = await fetch(`https://api.telegram.org/bot${config.botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as {
    ok: boolean;
    result?: T;
    description?: string;
    error_code?: number;
  };

  if (!data.ok) {
    throw new TelegramError(data.description ?? 'Неизвестная ошибка Telegram', method, data.error_code);
  }

  return data.result as T;
}

/**
 * Отправляет сообщение в чат.
 * Текст форматируется как HTML — не забудьте экранировать пользовательский ввод (см. escapeHtml).
 */
export async function sendMessage(
  chatId: string | number,
  text: string,
  buttons?: InlineButton[],
): Promise<void> {
  await callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(buttons && buttons.length > 0
      ? { reply_markup: { inline_keyboard: buttons.map((button) => [button]) } }
      : {}),
  });
}

/**
 * Отправляет сообщение психологу. Если chat_id не настроен — не роняем сценарий клиента,
 * а пишем предупреждение в лог: заявка всё равно сохранена в сессии.
 */
export async function sendToPsychologist(text: string, buttons?: InlineButton[]): Promise<boolean> {
  if (!config.psychologistChatId) {
    console.warn('[telegram] PSYCHOLOGIST_CHAT_ID не задан — уведомление психологу не отправлено');
    return false;
  }

  try {
    await sendMessage(config.psychologistChatId, text, buttons);
    return true;
  } catch (error) {
    console.error('[telegram] Не удалось отправить сообщение психологу:', error);
    return false;
  }
}

/** Экранирует спецсимволы HTML, чтобы пользовательский текст не ломал разметку сообщения. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
