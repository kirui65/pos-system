import type { RequestHandler } from 'express';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';
import { type TokenPayload, verifyToken } from '../utils/tokens';

export type AuthContext = Pick<TokenPayload, 'userId' | 'businessId' | 'role' | 'shopId'>;

export const authenticate: RequestHandler = (request, response, next) => {
  const authorization = request.header('authorization');
  if (!authorization?.startsWith('Bearer ')) return next(new HttpError(401, 'UNAUTHORIZED', 'Authentication is required.'));
  const payload = verifyToken(authorization.slice(7), env.JWT_ACCESS_SECRET, 'access');
  if (!payload) return next(new HttpError(401, 'UNAUTHORIZED', 'Invalid or expired access token.'));
  response.locals.auth = {
    userId: payload.userId,
    businessId: payload.businessId,
    role: payload.role,
    shopId: payload.shopId,
  } satisfies AuthContext;
  next();
};

export function authContext(response: { locals: { auth?: AuthContext } }) {
  if (!response.locals.auth) throw new HttpError(401, 'UNAUTHORIZED', 'Authentication is required.');
  return response.locals.auth;
}
