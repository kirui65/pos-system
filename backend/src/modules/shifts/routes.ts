import { randomUUID } from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { authenticate, authContext } from '../../middleware/authenticate';
import { HttpError } from '../../utils/httpError';

const openShiftSchema = z.object({
  openingFloatMinor: z.number().int().nonnegative().default(0),
  notes: z.string().max(300).optional(),
});

const closeShiftSchema = z.object({
  shiftId: z.string().uuid(),
  countedCashMinor: z.number().int().nonnegative(),
  notes: z.string().max(300).optional(),
});

export const shiftsRouter = Router();
shiftsRouter.use(authenticate);

shiftsRouter.get('/shifts/current', async (_request, response, next) => {
  try {
    const auth = authContext(response);
    const result = await pool.query(
      `SELECT
         s.id,
         s.opened_at AS "openedAt",
         s.opening_float_minor AS "openingFloatMinor",
         s.notes,
         u.full_name AS "cashierName",
         (
           SELECT COALESCE(SUM(p.amount_minor), 0)
           FROM sales sl
           JOIN payments p ON p.sale_id = sl.id
           WHERE sl.shift_id = s.id AND p.method = 'cash'
         ) AS "cashSalesMinor",
         (
           SELECT COUNT(*)
           FROM sales sl
           WHERE sl.shift_id = s.id
         ) AS "salesCount"
       FROM shifts s
       JOIN users u ON u.id = s.user_id
       WHERE s.shop_id = $1 AND s.business_id = $2 AND s.closed_at IS NULL
       ORDER BY s.opened_at DESC
       LIMIT 1`,
      [auth.shopId, auth.businessId],
    );

    response.json({ shift: result.rows[0] ?? null });
  } catch (error) { next(error); }
});

shiftsRouter.post('/shifts/open', async (request, response, next) => {
  try {
    const auth = authContext(response);
    const input = openShiftSchema.parse(request.body);

    // Check if open shift already exists for this shop
    const existing = await pool.query(
      'SELECT id FROM shifts WHERE shop_id = $1 AND business_id = $2 AND closed_at IS NULL',
      [auth.shopId, auth.businessId],
    );
    if (existing.rowCount) {
      throw new HttpError(400, 'SHIFT_ALREADY_OPEN', 'A shift is already open for this shop.');
    }

    const shiftId = randomUUID();
    const result = await pool.query(
      `INSERT INTO shifts(id, business_id, shop_id, user_id, opening_float_minor, notes)
       VALUES($1, $2, $3, $4, $5, $6)
       RETURNING id, opened_at AS "openedAt", opening_float_minor AS "openingFloatMinor", notes`,
      [shiftId, auth.businessId, auth.shopId, auth.userId, input.openingFloatMinor, input.notes ?? null],
    );

    response.status(201).json({ shift: result.rows[0] });
  } catch (error) { next(error); }
});

shiftsRouter.post('/shifts/close', async (request, response, next) => {
  try {
    const auth = authContext(response);
    const input = closeShiftSchema.parse(request.body);

    const shiftResult = await pool.query<{ id: string; opening_float_minor: string }>(
      'SELECT id, opening_float_minor FROM shifts WHERE id = $1 AND business_id = $2 AND shop_id = $3 AND closed_at IS NULL',
      [input.shiftId, auth.businessId, auth.shopId],
    );
    const shift = shiftResult.rows[0];
    if (!shift) throw new HttpError(404, 'SHIFT_NOT_FOUND', 'Open shift not found.');

    // Calculate cash payments made during this shift
    const cashResult = await pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(p.amount_minor), 0) AS total
       FROM sales s
       JOIN payments p ON p.sale_id = s.id
       WHERE s.shift_id = $1 AND p.method = 'cash'`,
      [input.shiftId],
    );

    const cashSalesMinor = Number(cashResult.rows[0]?.total || 0);
    const expectedCashMinor = Number(shift.opening_float_minor) + cashSalesMinor;

    const result = await pool.query(
      `UPDATE shifts
       SET closed_at = now(),
           expected_cash_minor = $1,
           counted_cash_minor = $2,
           notes = COALESCE($3, notes)
       WHERE id = $4
       RETURNING
         id,
         opened_at AS "openedAt",
         closed_at AS "closedAt",
         opening_float_minor AS "openingFloatMinor",
         expected_cash_minor AS "expectedCashMinor",
         counted_cash_minor AS "countedCashMinor",
         notes`,
      [expectedCashMinor, input.countedCashMinor, input.notes ?? null, input.shiftId],
    );

    response.json({ shift: result.rows[0], differenceMinor: input.countedCashMinor - expectedCashMinor });
  } catch (error) { next(error); }
});

shiftsRouter.get('/shifts', async (_request, response, next) => {
  try {
    const auth = authContext(response);
    const result = await pool.query(
      `SELECT
         s.id,
         s.opened_at AS "openedAt",
         s.closed_at AS "closedAt",
         s.opening_float_minor AS "openingFloatMinor",
         s.expected_cash_minor AS "expectedCashMinor",
         s.counted_cash_minor AS "countedCashMinor",
         s.notes,
         u.full_name AS "cashierName"
       FROM shifts s
       JOIN users u ON u.id = s.user_id
       WHERE s.shop_id = $1 AND s.business_id = $2
       ORDER BY s.opened_at DESC
       LIMIT 30`,
      [auth.shopId, auth.businessId],
    );

    response.json({ shifts: result.rows });
  } catch (error) { next(error); }
});
