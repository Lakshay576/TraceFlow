import * as Y from 'yjs';
import { DocumentModel, canAccessDocument } from '../models/document.js';
import { SnapshotModel, type SnapshotDoc } from '../models/Snapshot.js';
import { getOrLoadDoc } from '../socket/yjsDocManager.js';
import { getDocumentForUser } from './document.services.js';
import { ForbiddenError, NotFoundError } from '../errors/index.js';

export async function createSnapshot(
  documentId: string,
  userId: string,
  label?: string
): Promise<SnapshotDoc> {
  const doc = await getDocumentForUser(documentId, userId);
  if (!canAccessDocument(doc, userId, 'editor')) {
    throw new ForbiddenError('You need edit access to create a snapshot');
  }

  const [yDoc, docRecord] = await Promise.all([
    getOrLoadDoc(documentId),
    DocumentModel.findById(documentId).select('updateSeqCounter'),
  ]);

  if (!docRecord) throw new NotFoundError('Document not found');

  const state = Y.encodeStateAsUpdate(yDoc);

  return SnapshotModel.create({
    documentId,
    atSeq: docRecord.updateSeqCounter,
    yjsState: Buffer.from(state),
    label: label ?? null,
  });
}

export async function createSystemSnapshot(documentId: string): Promise<SnapshotDoc> {
  const [yDoc, docRecord] = await Promise.all([
    getOrLoadDoc(documentId),
    DocumentModel.findById(documentId).select('updateSeqCounter'),
  ]);

  if (!docRecord) throw new NotFoundError('Document not found');

  const state = Y.encodeStateAsUpdate(yDoc);

  return SnapshotModel.create({
    documentId,
    atSeq: docRecord.updateSeqCounter,
    yjsState: Buffer.from(state),
    label: 'Automatic snapshot',
  });
}

export async function listSnapshots(documentId: string, userId: string): Promise<SnapshotDoc[]> {
  const doc = await getDocumentForUser(documentId, userId);
  if (!canAccessDocument(doc, userId, 'viewer')) {
    throw new ForbiddenError('You do not have access to view this document');
  }

  return SnapshotModel.find({ documentId }).sort({ atSeq: -1 }).select('-yjsState');
}