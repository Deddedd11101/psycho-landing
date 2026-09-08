/**
 * Serverless-функция Vercel: POST /api/submit-form
 * Вся логика лежит в ../server/routes.ts — здесь только адаптер под Vercel.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

import { handleSubmitForm } from '../server/routes.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleSubmitForm(req, res as never);
}
