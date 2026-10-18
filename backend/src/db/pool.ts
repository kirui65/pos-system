import { Pool } from 'pg';
import { databaseSsl, env } from '../config/env';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: databaseSsl ? { rejectUnauthorized: false } : undefined,
});
