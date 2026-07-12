import { Redis } from 'ioredis';
import { env } from './env.js';

export function createRedisClients() {
  const pubClient = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 3,
  });

  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => {
    console.error('[redis:pub] connection error', err);
  });

  subClient.on('error', (err) => {
    console.error('[redis:sub] connection error', err);
  });

  return { pubClient, subClient };
}