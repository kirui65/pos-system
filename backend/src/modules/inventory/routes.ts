import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { authenticate, authContext } from '../../middleware/authenticate';
import { HttpError } from '../../utils/httpError';

const adjustInventorySchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  quantityChange: z.number().refine((val) => val !== 0, 'Quantity change must not be zero'),
  type: z.enum(['receive', 'adjustment', 'damage', 'return', 'stocktake_correction']).default('receive'),
  reason: z.string().max(250).optional(),
});

export const inventoryRouter = Router();
inventoryRouter.use(authenticate);

inventoryRouter.get('/inventory', async (_request, response, next) => {
  try {
    const auth = authContext(response);
    const result = await pool.query(
      `SELECT
         p.id,
         p.name,
         p.sku,
         p.barcode,
         p.cost_price_minor AS "costPriceMinor",
         p.selling_price_minor AS "sellingPriceMinor",
         COALESCE(sl.quantity, 0) AS quantity,
         p.reorder_level AS "reorderLevel",
         p.track_stock AS "trackStock"
       FROM products p
       LEFT JOIN stock_levels sl ON sl.product_id = p.id AND sl.shop_id = $1
       WHERE p.business_id = $2 AND p.deleted_at IS NULL
       ORDER BY p.name`,
      [auth.shopId, auth.businessId],
    );
    response.json({ inventory: result.rows });
  } catch (error) { next(error); }
});

inventoryRouter.get('/inventory/low-stock', async (_request, response, next) => {
  try {
    const auth = authContext(response);
    const result = await pool.query(
      `SELECT
         p.id,
         p.name,
         p.sku,
         COALESCE(sl.quantity, 0) AS quantity,
         p.reorder_level AS "reorderLevel"
       FROM products p
       LEFT JOIN stock_levels sl ON sl.product_id = p.id AND sl.shop_id = $1
       WHERE p.business_id = $2 AND p.track_stock = true AND p.deleted_at IS NULL
         AND COALESCE(sl.quantity, 0) <= p.reorder_level
       ORDER BY quantity, p.name`,
      [auth.shopId, auth.businessId],
    );
    response.json({ products: result.rows });
  } catch (error) { next(error); }
});

inventoryRouter.get('/inventory/movements', async (_request, response, next) => {
  try {
    const auth = authContext(response);
    const result = await pool.query(
      `SELECT
         sm.id,
         p.name AS "productName",
         sm.type,
         sm.quantity_change AS "quantityChange",
         sm.unit_cost_minor AS "unitCostMinor",
         sm.reason,
         sm.created_at AS "createdAt",
         COALESCE(u.full_name, 'System') AS "userName"
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       LEFT JOIN users u ON u.id = sm.created_by_user_id
       WHERE sm.business_id = $1 AND sm.shop_id = $2
       ORDER BY sm.created_at DESC
       LIMIT 50`,
      [auth.businessId, auth.shopId],
    );
    response.json({ movements: result.rows });
  } catch (error) { next(error); }
});

inventoryRouter.post('/inventory/adjust', async (request, response, next) => {
  const client = await pool.connect();
  try {
    const auth = authContext(response);
    const input = adjustInventorySchema.parse(request.body);

    await client.query('BEGIN');

    // 1. Verify product belongs to tenant
    const prodResult = await client.query<{ id: string; cost_price_minor: string }>(
      'SELECT id, cost_price_minor FROM products WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL',
      [input.productId, auth.businessId],
    );
    const prod = prodResult.rows[0];
    if (!prod) throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');

    // 2. Upsert stock levels
    const updateResult = await client.query<{ quantity: string }>(
      `UPDATE stock_levels
       SET quantity = quantity + $1, updated_at = now()
       WHERE shop_id = $2 AND product_id = $3 AND (variant_id = $4 OR (variant_id IS NULL AND $4 IS NULL))
       RETURNING quantity`,
      [input.quantityChange, auth.shopId, input.productId, input.variantId ?? null],
    );

    let newQuantity = input.quantityChange;
    if (updateResult.rowCount) {
      newQuantity = Number(updateResult.rows[0].quantity);
    } else {
      await client.query(
        `INSERT INTO stock_levels(shop_id, product_id, variant_id, business_id, quantity)
         VALUES($1, $2, $3, $4, $5)`,
        [auth.shopId, input.productId, input.variantId ?? null, auth.businessId, input.quantityChange],
      );
    }

    // 3. Record in stock_movements ledger
    await client.query(
      `INSERT INTO stock_movements(
         business_id, shop_id, product_id, variant_id,
         type, quantity_change, unit_cost_minor, reason,
         reference_type, created_by_user_id
       ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        auth.businessId,
        auth.shopId,
        input.productId,
        input.variantId ?? null,
        input.type,
        input.quantityChange,
        Number(prod.cost_price_minor),
        input.reason ?? `Manual adjustment (${input.type})`,
        'manual_adjustment',
        auth.userId,
      ],
    );

    await client.query('COMMIT');
    response.status(200).json({ productId: input.productId, newQuantity });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});
