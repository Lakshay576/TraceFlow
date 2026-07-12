import type { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../errors/index.js';

/**
 * Sits after all real routes, before the error handler. Anything that
 * reaches here didn't match a route, so we turn it into a NotFoundError
 * and hand it to `next()` — which routes it straight into errorHandler,
 * keeping the "unmatched route" response in the same consistent JSON shape
 * as every other error in the app.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
}