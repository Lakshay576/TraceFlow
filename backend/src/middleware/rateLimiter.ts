import type { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { StatusCodes } from 'http-status-codes';
import { createRateLimiterRedisClient } from '../config/redis.js';
import { logger } from '../config/logger.js';

const redisClient = createRateLimiterRedisClient();

const authLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl:auth',
  points: 5,
  duration: 15 * 60,
});

const generalLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl:general',
  points: 100,
  duration: 60,
});

function makeMiddleware(limiter: RateLimiterRedis) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await limiter.consume(req.ip ?? 'unknown');
      next();
    } catch (rejection) {
      if (rejection instanceof Error) {
        logger.error({ err: rejection }, '[rate-limiter] Redis error, failing open');
        return next();
      }

      logger.warn({ ip: req.ip }, '[rate-limiter] request blocked');
      res.status(StatusCodes.TOO_MANY_REQUESTS).json({
        error: 'TooManyRequestsError',
        message: 'Too many requests. Please try again later.',
      });
    }
  };
}

export const authRateLimiter = makeMiddleware(authLimiter);
export const generalRateLimiter = makeMiddleware(generalLimiter);