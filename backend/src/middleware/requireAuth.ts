import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../errors/index.js';

interface JwtPayload {
  userId: string;
  email: string;
}

/**
 * Not wrapped in asyncHandler because jwt.verify is synchronous — it
 * throws synchronously on an invalid/expired token, and Express catches
 * synchronous throws in regular middleware automatically (the async
 * problem only applies to rejected Promises). We still don't try/catch
 * here: the thrown JsonWebTokenError isn't an AppError, so it'll be
 * caught by the global handler's fallback branch — which is fine for now,
 * but we translate it to our own UnauthorizedError for a cleaner message.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }

  const token = authHeader.slice('Bearer '.length);

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }

  req.userId = payload.userId;
  next();
}