import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

function createBullMQConnection() {
  const client = new Redis(env.redisUrl, { maxRetriesPerRequest: null });
  client.on('error', (err) => {
    logger.error({ err }, '[redis:bullmq] connection error');
  });
  return client;
}

export const SNAPSHOT_QUEUE_NAME = 'snapshot-documents';
export const COMPACTION_QUEUE_NAME = 'compact-update-log';

export const snapshotQueue = new Queue(SNAPSHOT_QUEUE_NAME, {
  connection: createBullMQConnection(),
});

export const compactionQueue = new Queue(COMPACTION_QUEUE_NAME, {
  connection: createBullMQConnection(),
});

export function createWorker(
  queueName: string,
  processor: (job: Job) => Promise<void>
): Worker {
  const worker = new Worker(queueName, processor, {
    connection: createBullMQConnection(),
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, queue: queueName }, '[bullmq] job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, queue: queueName, err }, '[bullmq] job failed');
  });

  return worker;
}