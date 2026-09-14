/**
 * Serverless-функция Vercel: GET /api/admin/inbox
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

import { handleAdminInbox } from '../../server/adminRoutes.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleAdminInbox(req, res as never);
}
