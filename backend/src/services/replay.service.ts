import * as Y from 'yjs';
import { DocumentUpdateModel } from '../models/DocumentUpdate.js';
import { SnapshotModel } from '../models/Snapshot.js';
import { getDocumentForUser } from './document.services.js';
import { ForbiddenError } from '../errors/index.js';
import { canAccessDocument } from '../models/document.js';

export interface HistoryFrame {
  seq: number;
  userId: string;
  createdAt: Date;
}

export async function listHistoryFrames(documentId: string, userId: string): Promise<HistoryFrame[]> {
  const doc = await getDocumentForUser(documentId, userId);
  if (!canAccessDocument(doc, userId, 'viewer')) {
    throw new ForbiddenError('You do not have access to view this document');
  }

  const updates = await DocumentUpdateModel.find({ documentId })
    .select('seq userId createdAt')
    .sort({ seq: 1 });

  return updates.map((u) => ({ seq: u.seq, userId: u.userId.toString(), createdAt: u.createdAt }));
}

export async function reconstructAtSeq(documentId: string, targetSeq: number): Promise<Y.Doc> {
  const doc = new Y.Doc();

  const latestSnapshot = await SnapshotModel.findOne({
    documentId,
    atSeq: { $lte: targetSeq },
  }).sort({ atSeq: -1 });

  const fromSeqExclusive = latestSnapshot?.atSeq ?? 0;

  if (latestSnapshot) {
    Y.applyUpdate(doc, latestSnapshot.yjsState);
  }

  const updates = await DocumentUpdateModel.find({
    documentId,
    seq: { $gt: fromSeqExclusive, $lte: targetSeq },
  }).sort({ seq: 1 });

  for (const entry of updates) {
    Y.applyUpdate(doc, entry.update);
  }

  return doc;
}

export interface ReplayResult {
  seq: number;
  text: string;
}

export async function replayTextAtSeq(
  documentId: string,
  userId: string,
  targetSeq: number,
  field: string = 'content'
): Promise<ReplayResult> {
  const doc = await getDocumentForUser(documentId, userId);
  if (!canAccessDocument(doc, userId, 'viewer')) {
    throw new ForbiddenError('You do not have access to view this document');
  }

  const reconstructed = await reconstructAtSeq(documentId, targetSeq);
  return { seq: targetSeq, text: reconstructed.getText(field).toString() };
}