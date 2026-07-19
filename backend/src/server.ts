import { createServer } from 'http';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { initSocketServer } from './socket/index.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import {
  snapshotQueue,
  compactionQueue,
  createWorker,
  SNAPSHOT_QUEUE_NAME,
  COMPACTION_QUEUE_NAME,
} from './jobs/queue.js';
import { processPeriodicSnapshotJob } from './jobs/periodicSnapshot.job.js';
import { processCompactionJob } from './jobs/compactUpdateLog.job.js';

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

  createWorker(SNAPSHOT_QUEUE_NAME, processPeriodicSnapshotJob);
  createWorker(COMPACTION_QUEUE_NAME, processCompactionJob);

  await snapshotQueue.add(
    'periodic-snapshot',
    {},
    { repeat: { every: 5 * 60 * 1000 } }
  );
  await compactionQueue.add(
    'compact-update-log',
    {},
    { repeat: { every: 24 * 60 * 60 * 1000 } }
  );

  logger.info('[jobs] snapshot and compaction workers + schedules started');
}

main().catch((err) => {
  logger.error({ err }, '[server] fatal startup error');
  process.exit(1);
});