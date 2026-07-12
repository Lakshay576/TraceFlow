import { pinoHttp } from 'pino-http';
import { randomUUID } from 'crypto';
import { logger } from '../config/logger.js';

/**
 * Logs every incoming request/response automatically (method, path, status
 * code, response time) as structured JSON via the shared Pino instance.
 *
 * Each request gets a unique `requestId`, attached to req/res headers and
 * included in every log line for that request. This is what lets you take
 * a single confusing bug report ("it broke around 3pm") and grep logs for
 * one request's entire lifecycle — including, later, into the Socket.io
 * side, once we tag socket events with the same kind of ID.
 */
export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existingId = req.headers['x-request-id'];
    const id = (existingId as string) || randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  // Keep logs lean — don't dump full req/res objects, just the essentials
  serializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});