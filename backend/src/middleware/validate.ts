import type { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

/**
 * Wraps any Zod schema (shaped like { body, query, params }) as Express
 * middleware. On failure, it throws a ZodError — which our asyncHandler
 * forwards to `next()`, and the global errorHandler formats into a clean
 * 400 response with per-field messages. No try/catch needed here either.
 */
export function validate(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    }) as { body?: unknown };
    req.body = parsed.body ?? req.body;
    next();
  };
}