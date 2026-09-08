/**
 * Serverless-функция Vercel: GET /api/slots
 * Отдаёт занятое время, чтобы календарь на сайте не предлагал его повторно.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

import { handleGetSlots } from '../server/routes.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleGetSlots(req, res as never);
}
