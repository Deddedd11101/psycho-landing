/**
 * Serverless-функция Vercel: GET /api/admin/bookings
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

import { handleAdminBookings } from '../../server/adminRoutes.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleAdminBookings(req.query as Record<string, unknown>, req, res as never);
}
