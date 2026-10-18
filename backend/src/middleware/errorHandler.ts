import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  void _next;
  if (error instanceof ZodError) return response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Request validation failed.', details: error.flatten() } });
  const status = typeof error.statusCode === 'number' ? error.statusCode : 500;
  response.status(status).json({ error: { code: error.code ?? 'INTERNAL_ERROR', message: status === 500 ? 'Internal server error' : error.message } });
};
