/**
 * Проверка подлинности данных Telegram Mini App (initData).
 *
 * Mini App при открытии получает от Telegram строку initData с данными пользователя
 * и подписью. Подпись считается по алгоритму из документации:
 *   secret = HMAC_SHA256(key = "WebAppData", data = bot_token)
 *   hash   = HMAC_SHA256(key = secret, data = data_check_string)
 * где data_check_string — все поля кроме hash, отсортированные по ключу, через "\n".
 *
 * Так сервер убеждается, что запрос пришёл именно из Telegram и именно от этого
 * пользователя — и пускает в админку только специалиста (PSYCHOLOGIST_CHAT_ID).
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

import { config } from './config.js';

/** Пользователь Telegram из initData. */
export interface InitDataUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

/** Максимальный возраст initData: старую подпись можно было бы переиспользовать. */
const MAX_AGE_SECONDS = 24 * 60 * 60;

/** Возвращает пользователя, если подпись верна и данные свежие; иначе null. */
export function verifyInitData(initData: string): InitDataUser | null {
  if (!initData || !config.botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secret = createHmac('sha256', 'WebAppData').update(config.botToken).digest();
  const expected = createHmac('sha256', secret).update(dataCheckString).digest('hex');

  // Сравнение за постоянное время — защита от подбора по таймингу.
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(hash, 'hex');
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    return null;
  }

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || Date.now() / 1000 - authDate > MAX_AGE_SECONDS) {
    return null;
  }

  try {
    const user = JSON.parse(params.get('user') ?? '') as InitDataUser;
    return typeof user.id === 'number' ? user : null;
  } catch {
    return null;
  }
}

/** Пользователь — специалист, которому разрешена админка. */
export function isPsychologist(user: InitDataUser): boolean {
  return String(user.id) === config.psychologistChatId;
}
