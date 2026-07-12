import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Why this exists: Express does NOT automatically catch rejected Promises
 * thrown inside an async route handler. If you write:
 *
 *   app.get('/x', async (req, res) => { throw new Error('boom') })
 *
 * ...that rejection is silently swallowed — Express never calls your error
 * handler, and the request just hangs. The traditional fix is wrapping
 * every handler body in try/catch and manually calling next(err) in the
 * catch block — which gets repetitive fast across dozens of routes.
 *
 * asyncHandler wraps a handler once, so any rejected Promise (from a
 * `throw`, or a failed `await`) automatically flows into `next(err)`,
 * which Express then routes to our global errorHandler. Controllers and
 * services can then just `throw` naturally, with zero try/catch blocks,
 * and still have every error land in one consistent place.
 */
export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}