import { Job } from 'bullmq';
import { DocumentModel } from '../models/document.js';
import { SnapshotModel } from '../models/Snapshot.js';
import { createSystemSnapshot } from '../services/snapshot.service.js';
import { logger } from '../config/logger.js';

const MIN_UPDATES_SINCE_LAST_SNAPSHOT = 20;

export async function processPeriodicSnapshotJob(_job: Job): Promise<void> {
  const activeDocuments = await DocumentModel.find({ updateSeqCounter: { $gt: 0 } }).select(
    '_id updateSeqCounter'
  );

  let snapshotted = 0;

  for (const doc of activeDocuments) {
    const latestSnapshot = await SnapshotModel.findOne({ documentId: doc._id })
      .sort({ atSeq: -1 })
      .select('atSeq');

    const updatesSinceLastSnapshot = doc.updateSeqCounter - (latestSnapshot?.atSeq ?? 0);

    if (updatesSinceLastSnapshot >= MIN_UPDATES_SINCE_LAST_SNAPSHOT) {
      await createSystemSnapshot(doc._id.toString());
      snapshotted++;
    }
  }

  logger.info(
    { checked: activeDocuments.length, snapshotted },
    '[jobs] periodic snapshot run complete'
  );
}