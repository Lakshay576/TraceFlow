import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

export function createRedisClients() {
  const pubClient = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 3,
  });

  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => {
    logger.error({ err }, '[redis:pub] connection error');
  });

  subClient.on('error', (err) => {
    logger.error({ err }, '[redis:sub] connection error');
  });

  return { pubClient, subClient };
}

export function createRateLimiterRedisClient() {
  const client = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
  });

  client.on('error', (err) => {
    logger.error({ err }, '[redis:rate-limiter] connection error');
  });

  return client;
}