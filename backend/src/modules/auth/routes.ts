import bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env';
import { pool } from '../../db/pool';
import { authenticate, authContext } from '../../middleware/authenticate';
import { HttpError } from '../../utils/httpError';
import { createToken, verifyToken } from '../../utils/tokens';

const accessLifetimeSeconds = 15 * 60;
const refreshLifetimeSeconds = 30 * 24 * 60 * 60;
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1), shopId: z.string().uuid().optional(), deviceId: z.string().uuid().optional() });
const pinLoginSchema = z.object({ userId: z.string().uuid(), pin: z.string().min(4).max(12), shopId: z.string().uuid().optional(), deviceId: z.string().uuid().optional() });
const refreshSchema = z.object({ refreshToken: z.string().min(1) });
const switchShopSchema = z.object({ shopId: z.string().uuid() });

type UserRecord = {
  id: string;
  business_id: string;
  full_name: string;
  role: string;
  password_hash: string | null;
  pin_hash: string | null;
  is_active: boolean;
};

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

async function getDefaultShopId(user: UserRecord): Promise<string> {
  const isManager = user.role === 'manager' || user.role === 'owner';
  const result = await pool.query<{ id: string }>(
    isManager
      ? `SELECT id FROM shops WHERE business_id = $1 AND is_active = true AND deleted_at IS NULL ORDER BY created_at LIMIT 1`
      : `SELECT s.id FROM shops s JOIN user_shops us ON us.shop_id = s.id WHERE us.user_id = $1 AND s.is_active = true AND s.deleted_at IS NULL ORDER BY s.created_at LIMIT 1`,
    [isManager ? user.business_id : user.id],
  );
  if (!result.rowCount) throw new HttpError(400, 'NO_SHOP_ASSIGNED', 'No active shop assigned to user.');
  return result.rows[0].id;
}

async function assertShopAccess(user: UserRecord, shopId: string) {
  const result = await pool.query<{ id: string }>(
    `SELECT s.id
     FROM shops s
     WHERE s.id = $1 AND s.business_id = $2 AND s.is_active = true AND s.deleted_at IS NULL
       AND ($3 IN ('manager', 'owner') OR EXISTS (SELECT 1 FROM user_shops us WHERE us.user_id = $4 AND us.shop_id = s.id))`,
    [shopId, user.business_id, user.role, user.id],
  );
  if (!result.rowCount) throw new HttpError(403, 'SHOP_ACCESS_DENIED', 'You do not have access to this shop.');
}

async function createSession(user: UserRecord, shopId: string, deviceId?: string) {
  await assertShopAccess(user, shopId);
  if (deviceId) {
    const device = await pool.query<{ id: string }>(
      'SELECT id FROM devices WHERE id = $1 AND business_id = $2 AND shop_id = $3 AND status = $4',
      [deviceId, user.business_id, shopId, 'active'],
    );
    if (!device.rowCount) throw new HttpError(403, 'DEVICE_ACCESS_DENIED', 'This device is not active for the selected shop.');
  }
  const basePayload = { userId: user.id, businessId: user.business_id, role: user.role, shopId } as const;
  const accessToken = createToken({ ...basePayload, type: 'access' }, env.JWT_ACCESS_SECRET, accessLifetimeSeconds);
  const refreshToken = createToken({ ...basePayload, type: 'refresh' }, env.JWT_REFRESH_SECRET, refreshLifetimeSeconds);
  await pool.query(
    'INSERT INTO refresh_tokens(id,user_id,device_id,token_hash,expires_at) VALUES($1,$2,$3,$4,to_timestamp($5))',
    [randomUUID(), user.id, deviceId ?? null, tokenHash(refreshToken), Math.floor(Date.now() / 1000) + refreshLifetimeSeconds],
  );
  return { accessToken, refreshToken, user: { id: user.id, fullName: user.full_name, role: user.role, businessId: user.business_id, shopId } };
}

export const authRouter = Router();

authRouter.get('/auth/cashiers', async (request, response, next) => {
  try {
    const shopId = typeof request.query.shopId === 'string' ? request.query.shopId : undefined;
    const query = shopId
      ? `SELECT u.id, u.full_name AS "fullName", u.role
         FROM users u
         JOIN user_shops us ON us.user_id = u.id
         WHERE us.shop_id = $1 AND u.role = 'cashier' AND u.is_active = true AND u.deleted_at IS NULL
         ORDER BY u.full_name`
      : `SELECT u.id, u.full_name AS "fullName", u.role
         FROM users u
         WHERE u.role = 'cashier' AND u.is_active = true AND u.deleted_at IS NULL
         ORDER BY u.full_name`;
    const result = await pool.query(query, shopId ? [shopId] : []);
    response.json({ cashiers: result.rows });
  } catch (error) { next(error); }
});

authRouter.post('/auth/login', async (request, response, next) => {
  try {
    const input = loginSchema.parse(request.body);
    const result = await pool.query<UserRecord>(
      `SELECT u.id,u.business_id,u.full_name,u.role,u.password_hash,u.pin_hash,u.is_active
       FROM users u
       WHERE u.email = $1 AND u.is_active = true AND u.deleted_at IS NULL`,
      [input.email.toLowerCase()],
    );
    const user = result.rows[0];
    if (!user?.is_active || !user.password_hash || !(await bcrypt.compare(input.password, user.password_hash))) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }
    const targetShopId = input.shopId ?? (await getDefaultShopId(user));
    response.status(200).json(await createSession(user, targetShopId, input.deviceId));
  } catch (error) { next(error); }
});

authRouter.post('/auth/pin-login', async (request, response, next) => {
  try {
    const input = pinLoginSchema.parse(request.body);
    const result = await pool.query<UserRecord>(
      'SELECT id,business_id,full_name,role,password_hash,pin_hash,is_active FROM users WHERE id = $1 AND deleted_at IS NULL',
      [input.userId],
    );
    const user = result.rows[0];
    if (!user?.is_active || !user.pin_hash || !(await bcrypt.compare(input.pin, user.pin_hash))) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid user or PIN.');
    }
    const targetShopId = input.shopId ?? (await getDefaultShopId(user));
    response.status(200).json(await createSession(user, targetShopId, input.deviceId));
  } catch (error) { next(error); }
});

authRouter.post('/auth/refresh', async (request, response, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(request.body);
    const payload = verifyToken(refreshToken, env.JWT_REFRESH_SECRET, 'refresh');
    if (!payload) throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token.');
    const result = await pool.query<UserRecord>(
      `SELECT u.id,u.business_id,u.full_name,u.role,u.password_hash,u.pin_hash,u.is_active
       FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > now() AND u.deleted_at IS NULL`,
      [tokenHash(refreshToken)],
    );
    const user = result.rows[0];
    if (!user?.is_active || user.id !== payload.userId || user.business_id !== payload.businessId) {
      throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token.');
    }
    await pool.query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1', [tokenHash(refreshToken)]);
    response.status(200).json(await createSession(user, payload.shopId));
  } catch (error) { next(error); }
});

authRouter.post('/auth/logout', authenticate, async (request, response, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(request.body);
    const payload = verifyToken(refreshToken, env.JWT_REFRESH_SECRET, 'refresh');
    const auth = authContext(response);
    if (payload?.userId === auth.userId) await pool.query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1', [tokenHash(refreshToken)]);
    response.status(204).end();
  } catch (error) { next(error); }
});

authRouter.get('/auth/me', authenticate, async (_request, response, next) => {
  try {
    const auth = authContext(response);
    const result = await pool.query<{ id: string; full_name: string; email: string | null; role: string }>(
      'SELECT id,full_name,email,role FROM users WHERE id = $1 AND business_id = $2 AND is_active = true AND deleted_at IS NULL',
      [auth.userId, auth.businessId],
    );
    const user = result.rows[0];
    if (!user) throw new HttpError(401, 'UNAUTHORIZED', 'User account is unavailable.');
    response.json({ user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role }, businessId: auth.businessId, shopId: auth.shopId });
  } catch (error) { next(error); }
});

authRouter.post('/auth/switch-shop', authenticate, async (request, response, next) => {
  try {
    const { shopId } = switchShopSchema.parse(request.body);
    const auth = authContext(response);
    const userResult = await pool.query<UserRecord>(
      'SELECT id,business_id,full_name,role,password_hash,pin_hash,is_active FROM users WHERE id = $1 AND business_id = $2 AND is_active = true AND deleted_at IS NULL',
      [auth.userId, auth.businessId],
    );
    const user = userResult.rows[0];
    if (!user) throw new HttpError(401, 'UNAUTHORIZED', 'User not found or inactive.');
    response.status(200).json(await createSession(user, shopId));
  } catch (error) { next(error); }
});
