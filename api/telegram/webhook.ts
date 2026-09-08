/**
 * Serverless-функция Vercel: POST /api/telegram/webhook
 * Сюда Telegram присылает апдейты в продакшне.
 *
 * Установка вебхука (один раз после деплоя):
 *   npm run bot:set-webhook
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

import { handleTelegramWebhook } from '../../server/routes.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleTelegramWebhook(req, res as never);
}
