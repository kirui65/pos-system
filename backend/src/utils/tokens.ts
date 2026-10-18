import { createHmac, timingSafeEqual } from 'crypto';

type TokenType = 'access' | 'refresh';

export type TokenPayload = {
  userId: string;
  businessId: string;
  role: string;
  shopId: string;
  type: TokenType;
  exp: number;
};

const base64url = (value: Buffer | string) => Buffer.from(value).toString('base64url');

function signature(value: string, secret: string) {
  return base64url(createHmac('sha256', secret).update(value).digest());
}

export function createToken(payload: Omit<TokenPayload, 'exp'>, secret: string, lifetimeSeconds: number) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + lifetimeSeconds }));
  const value = `${header}.${body}`;
  return `${value}.${signature(value, secret)}`;
}

export function verifyToken(token: string, secret: string, type: TokenType): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, suppliedSignature] = parts;
  const value = `${header}.${body}`;
  const expectedSignature = signature(value, secret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (
      payload.type !== type ||
      typeof payload.userId !== 'string' ||
      typeof payload.businessId !== 'string' ||
      typeof payload.role !== 'string' ||
      typeof payload.shopId !== 'string' ||
      typeof payload.exp !== 'number' ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) return null;
    return payload;
  } catch {
    return null;
  }
}
