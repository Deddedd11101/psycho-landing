/**
 * Serverless-функция Vercel: GET/PUT /api/admin/schedule
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

import { handleAdminSchedule } from '../../server/adminRoutes.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleAdminSchedule(req, res as never);
}
