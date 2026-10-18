import pinoHttp from 'pino-http';
import pino from 'pino';

export const requestLogger = pinoHttp({ logger: pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' }) });
