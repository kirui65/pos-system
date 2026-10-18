import { randomUUID } from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { authenticate, authContext } from '../../middleware/authenticate';
import { HttpError } from '../../utils/httpError';

const customerSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().max(40).optional(),
  creditLimitMinor: z.number().int().nonnegative().default(0),
});

export const customersRouter = Router();
customersRouter.use(authenticate);

customersRouter.get('/customers', async (request, response, next) => {
  try {
    const auth = authContext(response);
    const search = typeof request.query.q === 'string' ? request.query.q.trim() : '';
    const query = search
      ? `SELECT id, name, phone, credit_limit_minor AS "creditLimitMinor", balance_minor AS "balanceMinor", created_at AS "createdAt"
         FROM customers
         WHERE business_id = $1 AND deleted_at IS NULL AND (name ILIKE $2 OR phone ILIKE $2)
         ORDER BY name LIMIT 50`
      : `SELECT id, name, phone, credit_limit_minor AS "creditLimitMinor", balance_minor AS "balanceMinor", created_at AS "createdAt"
         FROM customers
         WHERE business_id = $1 AND deleted_at IS NULL
         ORDER BY name LIMIT 50`;
    const params = search ? [auth.businessId, `%${search}%`] : [auth.businessId];
    const result = await pool.query(query, params);
    response.json({ customers: result.rows });
  } catch (error) { next(error); }
});

customersRouter.post('/customers', async (request, response, next) => {
  try {
    const auth = authContext(response);
    const input = customerSchema.parse(request.body);
    const id = randomUUID();
    const result = await pool.query(
      `INSERT INTO customers(id, business_id, name, phone, credit_limit_minor)
       VALUES($1, $2, $3, $4, $5)
       RETURNING id, name, phone, credit_limit_minor AS "creditLimitMinor", balance_minor AS "balanceMinor", created_at AS "createdAt"`,
      [id, auth.businessId, input.name, input.phone ?? null, input.creditLimitMinor],
    );
    response.status(201).json({ customer: result.rows[0] });
  } catch (error) { next(error); }
});

customersRouter.get('/customers/:id', async (request, response, next) => {
  try {
    const auth = authContext(response);
    const result = await pool.query(
      `SELECT id, name, phone, credit_limit_minor AS "creditLimitMinor", balance_minor AS "balanceMinor", created_at AS "createdAt"
       FROM customers
       WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
      [request.params.id, auth.businessId],
    );
    const customer = result.rows[0];
    if (!customer) throw new HttpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found.');
    response.json({ customer });
  } catch (error) { next(error); }
});
