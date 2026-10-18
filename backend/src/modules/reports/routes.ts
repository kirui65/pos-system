import { Router } from 'express';
import { pool } from '../../db/pool';
import { authenticate, authContext } from '../../middleware/authenticate';

export const reportsRouter = Router();
reportsRouter.use(authenticate);

reportsRouter.get('/reports/summary', async (request, response, next) => {
  try {
    const auth = authContext(response);
    const range = (request.query.range as string) || 'today';

    let dateFilter = "s.sold_at >= date_trunc('day', now())";
    if (range === 'week') {
      dateFilter = "s.sold_at >= now() - interval '7 days'";
    } else if (range === 'month') {
      dateFilter = "s.sold_at >= date_trunc('month', now())";
    } else if (range === 'all') {
      dateFilter = 'true';
    }

    const summaryQuery = `
      SELECT
        COALESCE(SUM(s.total_minor), 0) AS "totalRevenueMinor",
        COUNT(s.id) AS "salesCount",
        COALESCE(AVG(s.total_minor), 0)::bigint AS "averageTicketMinor",
        COALESCE(SUM(CASE WHEN p.method = 'cash' THEN p.amount_minor ELSE 0 END), 0) AS "cashTotalMinor",
        COALESCE(SUM(CASE WHEN p.method = 'mobile_money' THEN p.amount_minor ELSE 0 END), 0) AS "mpesaTotalMinor"
      FROM sales s
      LEFT JOIN payments p ON p.sale_id = s.id
      WHERE s.business_id = $1 AND s.shop_id = $2 AND s.deleted_at IS NULL AND ${dateFilter}
    `;

    const profitQuery = `
      SELECT
        COALESCE(SUM(si.line_total_minor - (si.quantity * si.unit_cost_minor)), 0)::bigint AS "estimatedProfitMinor"
      FROM sales s
      JOIN sale_items si ON si.sale_id = s.id
      WHERE s.business_id = $1 AND s.shop_id = $2 AND s.deleted_at IS NULL AND ${dateFilter}
    `;

    const [summaryRes, profitRes] = await Promise.all([
      pool.query(summaryQuery, [auth.businessId, auth.shopId]),
      pool.query(profitQuery, [auth.businessId, auth.shopId]),
    ]);

    response.json({
      summary: {
        ...summaryRes.rows[0],
        estimatedProfitMinor: profitRes.rows[0]?.estimatedProfitMinor || 0,
        range,
      },
    });
  } catch (error) { next(error); }
});

reportsRouter.get('/reports/top-products', async (_request, response, next) => {
  try {
    const auth = authContext(response);
    const result = await pool.query(
      `SELECT
         si.name_snapshot AS name,
         SUM(si.quantity)::numeric(14,2) AS "quantitySold",
         SUM(si.line_total_minor)::bigint AS "totalRevenueMinor"
       FROM sales s
       JOIN sale_items si ON si.sale_id = s.id
       WHERE s.business_id = $1 AND s.shop_id = $2 AND s.deleted_at IS NULL
       GROUP BY si.product_id, si.name_snapshot
       ORDER BY "quantitySold" DESC
       LIMIT 10`,
      [auth.businessId, auth.shopId],
    );

    response.json({ topProducts: result.rows });
  } catch (error) { next(error); }
});

reportsRouter.get('/reports/daily-trend', async (_request, response, next) => {
  try {
    const auth = authContext(response);
    const result = await pool.query(
      `SELECT
         to_char(date_trunc('day', s.sold_at), 'YYYY-MM-DD') AS day,
         to_char(s.sold_at, 'Dy') AS "dayOfWeek",
         COUNT(s.id) AS "transactionsCount",
         COALESCE(SUM(s.total_minor), 0)::bigint AS "revenueMinor"
       FROM sales s
       WHERE s.business_id = $1 AND s.shop_id = $2 AND s.deleted_at IS NULL
         AND s.sold_at >= now() - interval '7 days'
       GROUP BY date_trunc('day', s.sold_at), to_char(s.sold_at, 'Dy')
       ORDER BY date_trunc('day', s.sold_at) ASC`,
      [auth.businessId, auth.shopId],
    );

    response.json({ trend: result.rows });
  } catch (error) { next(error); }
});
