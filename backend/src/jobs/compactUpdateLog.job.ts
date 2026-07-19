import { Job } from 'bullmq';
import { DocumentUpdateModel } from '../models/DocumentUpdate.js';
import { SnapshotModel } from '../models/Snapshot.js';
import { logger } from '../config/logger.js';

const RETENTION_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

export async function processCompactionJob(_job: Job): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_WINDOW_MS);

  const documentsWithSnapshots = await SnapshotModel.aggregate([
    { $sort: { documentId: 1, atSeq: -1 } },
    { $group: { _id: '$documentId', latestAtSeq: { $first: '$atSeq' } } },
  ]);

  let totalDeleted = 0;

  for (const { _id: documentId, latestAtSeq } of documentsWithSnapshots) {
    const result = await DocumentUpdateModel.deleteMany({
      documentId,
      seq: { $lte: latestAtSeq },
      createdAt: { $lt: cutoff },
    });
    totalDeleted += result.deletedCount ?? 0;
  }

  logger.info(
    { documentsChecked: documentsWithSnapshots.length, totalDeleted },
    '[jobs] compaction run complete'
  );
}