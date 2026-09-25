import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import type { ApiError } from '@memory-lane/shared';
import { isProduction } from '../env.js';
import { logger } from '../lib/logger.js';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function notFound(_req: Request, res: Response): void {
  const body: ApiError = { error: 'Not found' };
  res.status(404).json(body);
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.flatten() } satisfies ApiError);
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details } satisfies ApiError);
    return;
  }

  logger.error('Unhandled error', err instanceof Error ? err.stack : err);
  res.status(500).json({
    error: 'Internal server error',
    ...(isProduction ? {} : { details: err instanceof Error ? err.message : String(err) }),
  } satisfies ApiError);
}
