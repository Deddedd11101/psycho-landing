/**
 * Serverless-функция Vercel: POST /api/booking
 * Привязывает Telegram-аккаунт клиента к заявке (вызывается ботом).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

import { handleBooking } from '../server/routes.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleBooking(req, res as never);
}
