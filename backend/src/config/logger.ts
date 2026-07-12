import pino from 'pino';
import { env } from './env.js';

/**
 * Why Pino over console.log:
 *
 * Pino outputs structured JSON (one object per line), not free-form text.
 * That matters because in production your logs get shipped to something
 * like Datadog/ELK/CloudWatch, and those tools search/filter/aggregate on
 * JSON fields (e.g. "show me all error-level logs for userId X in the
 * last hour"). console.log("user " + id + " logged in") is just a string —
 * there's nothing to query. Pino is also one of the fastest Node loggers
 * (it does almost no work on the hot path; formatting happens async), so
 * it doesn't become a bottleneck under load the way naive logging can.
 *
 * In development we pipe through 'pino-pretty' (via transport) so it's
 * still human-readable in your terminal, without changing what actually
 * ships in production.
 */
const options: pino.LoggerOptions = {
  level: env.nodeEnv === 'production' ? 'info' : 'debug',
};

if (env.nodeEnv !== 'production') {
  options.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  };
}

export const logger = pino(options);