import type { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';
import { logger } from '../config/logger.js';

/**
 * The single place every error in the app ends up, no matter where it was
 * thrown — a route handler, a service, an async function, Zod validation.
 *
 * This is what "global error handling" means in practice: instead of each
 * route deciding how to format an error response, they just `throw`, and
 * this one function decides the response shape. That gives you:
 *   1. Consistent JSON error responses across the entire API
 *   2. One place to add things like Sentry reporting later
 *   3. A clean way to hide internal details for unexpected (non-operational)
 *      errors, while still showing safe messages for expected ones
 *
 * Express recognizes this as an error handler specifically because it has
 * 4 parameters (err, req, res, next) — that signature is how Express tells
 * error-handling middleware apart from normal middleware.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Zod validation errors — map to a 400 with field-level detail
  if (err instanceof ZodError) {
    req.log?.warn({ err }, 'Validation failed');
    return res.status(StatusCodes.BAD_REQUEST).json({
      error: 'ValidationError',
      message: 'Invalid request data',
      details: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  // Known, expected errors we threw on purpose (NotFoundError, etc.)
  if (err instanceof AppError) {
    req.log?.warn({ err }, err.message);
    return res.status(err.statusCode).json({
      error: err.constructor.name,
      message: err.message,
    });
  }

  // Anything else is a genuine bug — log the full error server-side,
  // but never leak internals (stack trace, DB errors, etc.) to the client
  const error = err instanceof Error ? err : new Error('Unknown error');
  logger.error({ err: error, requestId: req.id }, 'Unhandled error');

  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    error: 'InternalServerError',
    message: 'Something went wrong. Please try again.',
  });
}