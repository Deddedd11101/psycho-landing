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

/** Кнопка в inline-клавиатуре: обычная ссылка или запуск Mini App (web_app). */
export interface InlineButton {
  text: string;
  url?: string;
  web_app?: { url: string };
}

/** Сколько раз повторяем запрос при сетевой ошибке и паузы между попытками. */
const NETWORK_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2500, 5000];

/** Сетевой сбой (нет соединения, таймаут) — в отличие от ответа Telegram с ошибкой. */
function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && /fetch failed/i.test(error.message);
}

/**
 * Вызывает произвольный метод Bot API.
 * При сетевом сбое повторяет запрос: с некоторых хостингов соединение до
 * api.telegram.org нестабильно, и одна неудачная попытка не должна терять
 * уведомление о заявке. Ошибки самого Telegram (4xx) не повторяются.
 */
export async function callTelegram<T>(method: string, payload: Record<string, unknown>): Promise<T> {
  if (!config.botToken) {
    throw new TelegramError('Не задана переменная окружения BOT_TOKEN', method);
  }

  let response: Response | undefined;
  for (let attempt = 0; attempt <= NETWORK_RETRIES; attempt += 1) {
    try {
      response = await fetch(`https://api.telegram.org/bot${config.botToken}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        // Долгий getUpdates держит соединение сам; остальным методам хватает 20 секунд.
        signal: AbortSignal.timeout(method === 'getUpdates' ? 60_000 : 20_000),
      });
      break;
    } catch (error) {
      const retryable = isNetworkError(error) || (error instanceof Error && error.name === 'TimeoutError');
      if (!retryable || attempt === NETWORK_RETRIES) throw error;

      const delay = RETRY_DELAYS_MS[attempt] ?? 5000;
      console.warn(`[telegram] ${method}: сеть недоступна, повтор ${attempt + 1}/${NETWORK_RETRIES} через ${delay} мс`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  if (!response) {
    throw new TelegramError('Нет ответа от Telegram', method);
  }

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

/** Собирает inline-клавиатуру: каждая кнопка на своей строке. */
function keyboard(buttons?: InlineButton[]): Record<string, unknown> {
  return buttons && buttons.length > 0 ? { reply_markup: { inline_keyboard: buttons.map((button) => [button]) } } : {};
}

/** Дополнительные параметры отправки. */
export interface SendOptions {
  /** Ответить на конкретное сообщение (получатель увидит цитату). */
  replyTo?: number;
}

/**
 * Отправляет сообщение в чат и возвращает его message_id — он нужен, чтобы позже
 * отредактировать сообщение. Текст в HTML — пользовательский ввод экранируется через escapeHtml.
 */
export async function sendMessage(
  chatId: string | number,
  text: string,
  buttons?: InlineButton[],
  options: SendOptions = {},
): Promise<number> {
  const result = await callTelegram<{ message_id: number }>('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(options.replyTo ? { reply_parameters: { message_id: options.replyTo } } : {}),
    ...keyboard(buttons),
  });
  return result.message_id;
}

/** Меняет текст (и кнопки) уже отправленного ботом сообщения. */
export async function editMessage(
  chatId: string | number,
  messageId: number,
  text: string,
  buttons?: InlineButton[],
): Promise<void> {
  await callTelegram('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...keyboard(buttons),
  });
}

/**
 * Отправляет сообщение психологу и возвращает его message_id (или null при ошибке).
 * Если chat_id не настроен — не роняем сценарий клиента, а пишем предупреждение в лог:
 * заявка всё равно сохранена в сессии.
 */
export async function sendToPsychologist(
  text: string,
  buttons?: InlineButton[],
  options: SendOptions = {},
): Promise<number | null> {
  if (!config.psychologistChatId) {
    console.warn('[telegram] PSYCHOLOGIST_CHAT_ID не задан — уведомление психологу не отправлено');
    return null;
  }

  try {
    return await sendMessage(config.psychologistChatId, text, buttons, options);
  } catch (error) {
    console.error('[telegram] Не удалось отправить сообщение психологу:', error);
    return null;
  }
}

/**
 * Редактирует сообщение в чате психолога. Возвращает false, если не получилось
 * (например, сообщение удалено) — тогда вызывающий код отправит новое.
 */
export async function editPsychologistMessage(
  messageId: number,
  text: string,
  buttons?: InlineButton[],
): Promise<boolean> {
  if (!config.psychologistChatId) return false;

  try {
    await editMessage(config.psychologistChatId, messageId, text, buttons);
    return true;
  } catch (error) {
    console.error('[telegram] Не удалось отредактировать сообщение психологу:', error);
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
