import { createServer } from 'http';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { initSocketServer } from './socket/index.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

function logEnvSummary() {
  logger.info(
    {
      port: env.port,
      nodeEnv: env.nodeEnv,
      clientOrigin: env.clientOrigin,
      jwtExpiresIn: env.jwtExpiresIn,
      mongoUriSet: Boolean(env.mongoUri),
      redisUrlSet: Boolean(env.redisUrl),
      jwtSecretSet: Boolean(env.jwtSecret),
    },
    'Environment loaded from .env'
  );
}

async function main() {
    logEnvSummary();
  await mongoose.connect(env.mongoUri);
  logger.info('[mongo] connected');

  const app = createApp();
  const httpServer = createServer(app);

  await initSocketServer(httpServer);

  httpServer.listen(env.port, () => {
    logger.info(`[server] listening on port ${env.port} (${env.nodeEnv})`);
  });
}

main().catch((err) => {
  logger.error({ err }, '[server] fatal startup error');
  process.exit(1);
});