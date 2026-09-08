/**
 * Serverless-функция Vercel: GET /api/session/:id
 * Динамический сегмент [id] Vercel кладёт в req.query.id.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

import { handleGetSession } from '../../server/routes.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const raw = req.query.id;
  const id = Array.isArray(raw) ? raw[0] : (raw ?? '');
  await handleGetSession(id, req, res as never);
}
