/**
 * Serverless-функция Vercel: POST /api/admin/cancel
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

import { handleAdminCancel } from '../../server/adminRoutes.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleAdminCancel(req, res as never);
}
