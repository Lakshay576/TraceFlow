import { DocumentModel } from '../models/document.js';
import { DocumentUpdateModel } from '../models/DocumentUpdate.js';
import { logger } from '../config/logger.js';

export async function logDocumentUpdate(
  documentId: string,
  userId: string,
  updateBytes: Uint8Array
): Promise<number> {
  const updated = await DocumentModel.findByIdAndUpdate(
    documentId,
    { $inc: { updateSeqCounter: 1 } },
    { new: true, select: 'updateSeqCounter' }
  );

  const seq = updated?.updateSeqCounter ?? 0;

  await DocumentUpdateModel.create({
    documentId,
    seq,
    update: Buffer.from(updateBytes),
    userId,
  });

  logger.info({ documentId, seq }, '[history] logged update');
  return seq;
}