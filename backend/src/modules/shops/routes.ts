import { Router } from 'express';
import { pool } from '../../db/pool';
import { authenticate, authContext } from '../../middleware/authenticate';

export const shopsRouter = Router();
shopsRouter.use(authenticate);

shopsRouter.get('/shops', async (_request, response, next) => {
  try {
    const auth = authContext(response);
    const result = await pool.query<{
      id: string;
      name: string;
      address: string | null;
      phone: string | null;
      currencyCode: string;
      taxRateBps: number;
    }>(
      `SELECT s.id, s.name, s.address, s.phone, s.currency_code AS "currencyCode", s.tax_rate_bps AS "taxRateBps"
       FROM shops s
       WHERE s.business_id = $1 AND s.is_active = true AND s.deleted_at IS NULL
         AND ($2 IN ('manager', 'owner') OR EXISTS (SELECT 1 FROM user_shops us WHERE us.user_id = $3 AND us.shop_id = s.id))
       ORDER BY s.name`,
      [auth.businessId, auth.role, auth.userId],
    );
    response.json({ shops: result.rows });
  } catch (error) { next(error); }
});
