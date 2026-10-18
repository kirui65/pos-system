import { app } from './app';
import { env } from './config/env';
import { pool } from './db/pool';

const server = app.listen(env.PORT, () => console.log(`API listening on ${env.PORT}`));
const close = async () => { server.close(); await pool.end(); };
process.on('SIGTERM', close);
process.on('SIGINT', close);
