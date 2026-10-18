import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { authenticate, authContext } from '../../middleware/authenticate';
import { HttpError } from '../../utils/httpError';

const updateShopSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  address: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  receiptFooter: z.string().max(200).optional(),
  taxRateBps: z.number().int().nonnegative().optional(),
});

export const settingsRouter = Router();
settingsRouter.use(authenticate);

settingsRouter.get('/settings', async (_request, response, next) => {
  try {
    const auth = authContext(response);
    const [bizRes, shopRes] = await Promise.all([
      pool.query('SELECT id, name, phone, email, status FROM businesses WHERE id = $1', [auth.businessId]),
      pool.query(
        `SELECT id, name, address, phone, currency_code AS "currencyCode", tax_rate_bps AS "taxRateBps", receipt_footer AS "receiptFooter"
         FROM shops WHERE id = $1 AND business_id = $2`,
        [auth.shopId, auth.businessId],
      ),
    ]);

    response.json({
      business: bizRes.rows[0],
      shop: shopRes.rows[0],
    });
  } catch (error) { next(error); }
});

settingsRouter.patch('/settings/shop', async (request, response, next) => {
  try {
    const auth = authContext(response);
    if (!['owner', 'manager'].includes(auth.role)) {
      throw new HttpError(403, 'FORBIDDEN', 'Only managers can update shop settings.');
    }

    const input = updateShopSchema.parse(request.body);
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.name !== undefined) { updates.push(`name = $${idx++}`); values.push(input.name); }
    if (input.address !== undefined) { updates.push(`address = $${idx++}`); values.push(input.address); }
    if (input.phone !== undefined) { updates.push(`phone = $${idx++}`); values.push(input.phone); }
    if (input.receiptFooter !== undefined) { updates.push(`receipt_footer = $${idx++}`); values.push(input.receiptFooter); }
    if (input.taxRateBps !== undefined) { updates.push(`tax_rate_bps = $${idx++}`); values.push(input.taxRateBps); }

    if (!updates.length) {
      throw new HttpError(400, 'NO_CHANGES', 'Provide at least one setting field to update.');
    }

    values.push(auth.shopId, auth.businessId);
    const result = await pool.query(
      `UPDATE shops
       SET ${updates.join(', ')}, updated_at = now()
       WHERE id = $${idx++} AND business_id = $${idx++}
       RETURNING id, name, address, phone, currency_code AS "currencyCode", tax_rate_bps AS "taxRateBps", receipt_footer AS "receiptFooter"`,
      values,
    );

    response.json({ shop: result.rows[0] });
  } catch (error) { next(error); }
});

settingsRouter.get('/staff', async (_request, response, next) => {
  try {
    const auth = authContext(response);
    const result = await pool.query(
      `SELECT
         u.id,
         u.full_name AS "fullName",
         u.email,
         u.phone,
         u.role,
         u.is_active AS "isActive",
         u.created_at AS "createdAt"
       FROM users u
       WHERE u.business_id = $1 AND u.deleted_at IS NULL
       ORDER BY u.role, u.full_name`,
      [auth.businessId],
    );

    response.json({ staff: result.rows });
  } catch (error) { next(error); }
});
