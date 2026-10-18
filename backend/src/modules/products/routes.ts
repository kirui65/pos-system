import { randomUUID } from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { authenticate, authContext } from '../../middleware/authenticate';
import { HttpError } from '../../utils/httpError';

const productSchema = z.object({
  name: z.string().min(1).max(160),
  sku: z.string().max(80).optional(),
  barcode: z.string().max(80).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  costPriceMinor: z.number().int().nonnegative().default(0),
  sellingPriceMinor: z.number().int().nonnegative(),
  reorderLevel: z.number().nonnegative().default(0),
  trackStock: z.boolean().default(true),
});

export const productsRouter = Router();
productsRouter.use(authenticate);

productsRouter.get('/products', async (_request, response, next) => {
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
         p.reorder_level AS "reorderLevel",
         p.track_stock AS "trackStock",
         COALESCE(sl.quantity, 0) AS "stockQuantity"
       FROM products p
       LEFT JOIN stock_levels sl ON sl.product_id = p.id AND sl.shop_id = $2
       WHERE p.business_id = $1 AND p.deleted_at IS NULL
       ORDER BY p.name`,
      [auth.businessId, auth.shopId],
    );
    response.json({ products: result.rows });
  } catch (error) { next(error); }
});

productsRouter.post('/products', async (request, response, next) => {
  try {
    const auth = authContext(response);
    if (!['owner', 'manager'].includes(auth.role)) {
      throw new HttpError(403, 'FORBIDDEN', 'Only managers can create products.');
    }
    const input = productSchema.parse(request.body);
    const id = randomUUID();
    const result = await pool.query(
      `INSERT INTO products(id, business_id, category_id, name, sku, barcode, cost_price_minor, selling_price_minor, reorder_level, track_stock)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, name, sku, barcode, cost_price_minor AS "costPriceMinor", selling_price_minor AS "sellingPriceMinor", reorder_level AS "reorderLevel", track_stock AS "trackStock"`,
      [
        id,
        auth.businessId,
        input.categoryId ?? null,
        input.name,
        input.sku ?? null,
        input.barcode ?? null,
        input.costPriceMinor,
        input.sellingPriceMinor,
        input.reorderLevel,
        input.trackStock,
      ],
    );

    // Seed initial stock level 0 for this shop
    await pool.query(
      `INSERT INTO stock_levels(shop_id, product_id, business_id, quantity)
       VALUES($1, $2, $3, 0)
       ON CONFLICT DO NOTHING`,
      [auth.shopId, id, auth.businessId],
    );

    response.status(201).json({ product: { ...result.rows[0], stockQuantity: 0 } });
  } catch (error) { next(error); }
});

productsRouter.patch('/products/:id', async (request, response, next) => {
  try {
    const auth = authContext(response);
    if (!['owner', 'manager'].includes(auth.role)) {
      throw new HttpError(403, 'FORBIDDEN', 'Only managers can update products.');
    }
    const input = productSchema.partial().parse(request.body);
    const fields = Object.entries({
      name: input.name,
      sku: input.sku,
      barcode: input.barcode,
      category_id: input.categoryId,
      cost_price_minor: input.costPriceMinor,
      selling_price_minor: input.sellingPriceMinor,
      reorder_level: input.reorderLevel,
      track_stock: input.trackStock,
    }).filter(([, value]) => value !== undefined);

    if (!fields.length) throw new HttpError(400, 'VALIDATION_ERROR', 'Provide at least one field to update.');
    const values = fields.map(([, value]) => value);
    const assignments = fields.map(([key], index) => `${key}=$${index + 1}`).join(',');

    const result = await pool.query(
      `UPDATE products
       SET ${assignments}, updated_at = now()
       WHERE id = $${values.length + 1} AND business_id = $${values.length + 2} AND deleted_at IS NULL
       RETURNING id, name, sku, barcode, cost_price_minor AS "costPriceMinor", selling_price_minor AS "sellingPriceMinor", reorder_level AS "reorderLevel", track_stock AS "trackStock"`,
      [...values, request.params.id, auth.businessId],
    );

    if (!result.rowCount) throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
    response.json({ product: result.rows[0] });
  } catch (error) { next(error); }
});

productsRouter.delete('/products/:id', async (request, response, next) => {
  try {
    const auth = authContext(response);
    if (!['owner', 'manager'].includes(auth.role)) {
      throw new HttpError(403, 'FORBIDDEN', 'Only managers can delete products.');
    }
    const result = await pool.query(
      'UPDATE products SET deleted_at = now() WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL RETURNING id, name',
      [request.params.id, auth.businessId],
    );
    if (!result.rowCount) throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
    response.json({ message: 'Product successfully removed', id: request.params.id, name: result.rows[0].name });
  } catch (error) { next(error); }
});
