import { randomUUID } from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { authenticate, authContext } from '../../middleware/authenticate';
import { HttpError } from '../../utils/httpError';

const saleItemInputSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  quantity: z.number().positive(),
  unitPriceMinor: z.number().int().nonnegative().optional(),
  discountMinor: z.number().int().nonnegative().default(0),
});

const paymentInputSchema = z.object({
  method: z.enum(['cash', 'mobile_money']),
  amountMinor: z.number().int().positive(),
  reference: z.string().max(100).optional(),
});

const createSaleSchema = z.object({
  customerId: z.string().uuid().nullable().optional(),
  shiftId: z.string().uuid().nullable().optional(),
  discountMinor: z.number().int().nonnegative().default(0),
  taxMinor: z.number().int().nonnegative().default(0),
  items: z.array(saleItemInputSchema).min(1),
  payments: z.array(paymentInputSchema).min(1),
  notes: z.string().max(500).optional(),
});

export const salesRouter = Router();
salesRouter.use(authenticate);

salesRouter.get('/sales', async (request, response, next) => {
  try {
    const auth = authContext(response);
    const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 100);
    const offset = Math.max(Number(request.query.offset) || 0, 0);

    const result = await pool.query<{
      id: string;
      receiptNumber: string;
      subtotalMinor: number;
      discountMinor: number;
      taxMinor: number;
      totalMinor: number;
      paidMinor: number;
      changeMinor: number;
      status: string;
      soldAt: string;
      cashierName: string;
      customerName: string | null;
      itemsCount: number;
      paymentMethods: string;
    }>(
      `SELECT
         s.id,
         s.receipt_number AS "receiptNumber",
         s.subtotal_minor AS "subtotalMinor",
         s.discount_minor AS "discountMinor",
         s.tax_minor AS "taxMinor",
         s.total_minor AS "totalMinor",
         s.paid_minor AS "paidMinor",
         s.change_minor AS "changeMinor",
         s.status,
         s.sold_at AS "soldAt",
         u.full_name AS "cashierName",
         c.name AS "customerName",
         (SELECT count(*)::int FROM sale_items si WHERE si.sale_id = s.id) AS "itemsCount",
         COALESCE((SELECT string_agg(DISTINCT p.method, ', ') FROM payments p WHERE p.sale_id = s.id), 'None') AS "paymentMethods"
       FROM sales s
       JOIN users u ON u.id = s.cashier_user_id
       LEFT JOIN customers c ON c.id = s.customer_id
       WHERE s.business_id = $1 AND s.shop_id = $2 AND s.deleted_at IS NULL
       ORDER BY s.sold_at DESC
       LIMIT $3 OFFSET $4`,
      [auth.businessId, auth.shopId, limit, offset],
    );

    const countResult = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM sales WHERE business_id = $1 AND shop_id = $2 AND deleted_at IS NULL',
      [auth.businessId, auth.shopId],
    );

    response.json({
      sales: result.rows,
      total: Number(countResult.rows[0]?.count || 0),
      limit,
      offset,
    });
  } catch (error) { next(error); }
});

salesRouter.get('/sales/:id', async (request, response, next) => {
  try {
    const auth = authContext(response);
    const saleResult = await pool.query(
      `SELECT
         s.id,
         s.receipt_number AS "receiptNumber",
         s.subtotal_minor AS "subtotalMinor",
         s.discount_minor AS "discountMinor",
         s.tax_minor AS "taxMinor",
         s.total_minor AS "totalMinor",
         s.paid_minor AS "paidMinor",
         s.change_minor AS "changeMinor",
         s.status,
         s.sold_at AS "soldAt",
         u.full_name AS "cashierName",
         c.name AS "customerName",
         sh.name AS "shopName"
       FROM sales s
       JOIN users u ON u.id = s.cashier_user_id
       JOIN shops sh ON sh.id = s.shop_id
       LEFT JOIN customers c ON c.id = s.customer_id
       WHERE s.id = $1 AND s.business_id = $2 AND s.deleted_at IS NULL`,
      [request.params.id, auth.businessId],
    );

    const sale = saleResult.rows[0];
    if (!sale) throw new HttpError(404, 'SALE_NOT_FOUND', 'Sale not found.');

    const itemsResult = await pool.query(
      `SELECT
         si.id,
         si.product_id AS "productId",
         si.name_snapshot AS "name",
         si.quantity,
         si.unit_price_minor AS "unitPriceMinor",
         si.discount_minor AS "discountMinor",
         si.line_total_minor AS "lineTotalMinor"
       FROM sale_items si
       WHERE si.sale_id = $1
       ORDER BY si.created_at ASC`,
      [sale.id],
    );

    const paymentsResult = await pool.query(
      `SELECT
         p.id,
         p.method,
         p.amount_minor AS "amountMinor",
         p.reference
       FROM payments p
       WHERE p.sale_id = $1
       ORDER BY p.created_at ASC`,
      [sale.id],
    );

    response.json({
      sale: {
        ...sale,
        items: itemsResult.rows,
        payments: paymentsResult.rows,
      },
    });
  } catch (error) { next(error); }
});

salesRouter.post('/sales', async (request, response, next) => {
  const client = await pool.connect();
  try {
    const auth = authContext(response);
    const input = createSaleSchema.parse(request.body);

    await client.query('BEGIN');

    // 1. Fetch products info for price & cost snapshots and verification
    const productIds = input.items.map((item) => item.productId);
    const productsResult = await client.query<{
      id: string;
      name: string;
      cost_price_minor: string;
      selling_price_minor: string;
      track_stock: boolean;
    }>(
      `SELECT id, name, cost_price_minor, selling_price_minor, track_stock
       FROM products
       WHERE id = ANY($1::uuid[]) AND business_id = $2 AND deleted_at IS NULL`,
      [productIds, auth.businessId],
    );

    const productMap = new Map(productsResult.rows.map((p) => [p.id, p]));
    for (const item of input.items) {
      if (!productMap.has(item.productId)) {
        throw new HttpError(400, 'PRODUCT_NOT_FOUND', `Product ${item.productId} was not found or is inactive.`);
      }
    }

    // 2. Calculate item totals and sale subtotal
    let calculatedSubtotalMinor = 0;
    const computedItems = input.items.map((item) => {
      const prod = productMap.get(item.productId)!;
      const unitPriceMinor = item.unitPriceMinor ?? Number(prod.selling_price_minor);
      const unitCostMinor = Number(prod.cost_price_minor);
      const lineTotalMinor = Math.round(unitPriceMinor * item.quantity) - item.discountMinor;
      calculatedSubtotalMinor += lineTotalMinor;
      return {
        ...item,
        nameSnapshot: prod.name,
        unitPriceMinor,
        unitCostMinor,
        lineTotalMinor,
        trackStock: prod.track_stock,
      };
    });

    const totalMinor = calculatedSubtotalMinor - input.discountMinor + input.taxMinor;
    if (totalMinor < 0) {
      throw new HttpError(400, 'INVALID_TOTAL', 'Sale total cannot be negative.');
    }

    const paidMinor = input.payments.reduce((sum, p) => sum + p.amountMinor, 0);
    const changeMinor = paidMinor > totalMinor ? paidMinor - totalMinor : 0;

    if (paidMinor < totalMinor && !input.customerId) {
      throw new HttpError(400, 'INSUFFICIENT_PAYMENT', 'Total payment is less than sale total and no customer specified for credit.');
    }

    // 3. Generate receipt number
    const receiptSuffix = `${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
    const receiptNumber = `RS-${receiptSuffix}`;
    const saleId = randomUUID();

    // 4. Insert into sales table
    await client.query(
      `INSERT INTO sales(
         id, business_id, shop_id, shift_id, cashier_user_id, customer_id,
         receipt_number, status, subtotal_minor, discount_minor, tax_minor,
         total_minor, paid_minor, change_minor
       ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        saleId,
        auth.businessId,
        auth.shopId,
        input.shiftId ?? null,
        auth.userId,
        input.customerId ?? null,
        receiptNumber,
        'completed',
        calculatedSubtotalMinor,
        input.discountMinor,
        input.taxMinor,
        totalMinor,
        paidMinor,
        changeMinor,
      ],
    );

    // 5. Insert line items & adjust stock
    for (const item of computedItems) {
      const saleItemId = randomUUID();
      await client.query(
        `INSERT INTO sale_items(
           id, sale_id, business_id, product_id, variant_id,
           name_snapshot, quantity, unit_price_minor, unit_cost_minor,
           discount_minor, line_total_minor
         ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          saleItemId,
          saleId,
          auth.businessId,
          item.productId,
          item.variantId ?? null,
          item.nameSnapshot,
          item.quantity,
          item.unitPriceMinor,
          item.unitCostMinor,
          item.discountMinor,
          item.lineTotalMinor,
        ],
      );

      // Stock adjustment if tracked
      if (item.trackStock) {
        // Update stock levels
        const stockUpdate = await client.query(
          `UPDATE stock_levels
           SET quantity = quantity - $1, updated_at = now()
           WHERE shop_id = $2 AND product_id = $3 AND (variant_id = $4 OR (variant_id IS NULL AND $4 IS NULL))`,
          [item.quantity, auth.shopId, item.productId, item.variantId ?? null],
        );

        if (!stockUpdate.rowCount) {
          await client.query(
            `INSERT INTO stock_levels(shop_id, product_id, variant_id, business_id, quantity)
             VALUES($1, $2, $3, $4, $5)`,
            [auth.shopId, item.productId, item.variantId ?? null, auth.businessId, -item.quantity],
          );
        }

        // Add ledger record to stock_movements
        await client.query(
          `INSERT INTO stock_movements(
             business_id, shop_id, product_id, variant_id,
             type, quantity_change, unit_cost_minor, reason,
             reference_type, reference_id, created_by_user_id
           ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            auth.businessId,
            auth.shopId,
            item.productId,
            item.variantId ?? null,
            'sale',
            -item.quantity,
            item.unitCostMinor,
            `Sale ${receiptNumber}`,
            'sale',
            saleId,
            auth.userId,
          ],
        );
      }
    }

    // 6. Record payments
    for (const payment of input.payments) {
      await client.query(
        `INSERT INTO payments(
           id, sale_id, business_id, method, amount_minor, reference
         ) VALUES($1, $2, $3, $4, $5, $6)`,
        [
          randomUUID(),
          saleId,
          auth.businessId,
          payment.method,
          payment.amountMinor,
          payment.reference ?? null,
        ],
      );
    }

    // 7. Update customer balance if debt/credit
    if (input.customerId && paidMinor < totalMinor) {
      const debtMinor = totalMinor - paidMinor;
      await client.query(
        `UPDATE customers
         SET balance_minor = balance_minor + $1, updated_at = now()
         WHERE id = $2 AND business_id = $3`,
        [debtMinor, input.customerId, auth.businessId],
      );
    }

    await client.query('COMMIT');

    response.status(201).json({
      sale: {
        id: saleId,
        receiptNumber,
        subtotalMinor: calculatedSubtotalMinor,
        discountMinor: input.discountMinor,
        taxMinor: input.taxMinor,
        totalMinor,
        paidMinor,
        changeMinor,
        items: computedItems,
        payments: input.payments,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});
