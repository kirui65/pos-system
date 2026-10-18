import { Router } from 'express';
import { pool } from '../../db/pool';
import { HttpError } from '../../utils/httpError';

export const healthRouter = Router();
healthRouter.get('/health', async (_request, response, next) => {
  try { await pool.query('SELECT 1'); response.json({ status: 'ok', database: 'ok' }); } catch { next(new HttpError(503, 'DATABASE_UNAVAILABLE', 'Database unavailable')); }
});
