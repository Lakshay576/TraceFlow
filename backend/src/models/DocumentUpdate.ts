import {Schema, model} from 'mongoose';
import type { Document as MongooseDocument, InferSchemaType } from 'mongoose';

/**
 * This collection is deliberately separate from Document.yjsState.
 * yjsState is a collapsed SNAPSHOT — the current state, good for fast
 * loading, but it has no memory of how it got there. This collection is
 * the individual UPDATE LOG — every discrete change, kept in order,
 * which is what actually makes "scrub back to 10 minutes ago" possible:
 * replay updates 1..N from an empty Y.Doc and you get the exact
 * intermediate state at any point in the document's history, not just
 * its current or most-recently-snapshotted state.
 */
const documentUpdateSchema = new Schema(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    // Monotonically increasing per-document sequence number (NOT a
    // timestamp) — makes "replay up to frame 47" unambiguous even if
    // two updates land in the same millisecond, which raw timestamp
    // ordering can't guarantee.
    seq: { type: Number, required: true },
    update: { type: Buffer, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

documentUpdateSchema.index({ documentId: 1, seq: 1 }, { unique: true });

export type DocumentUpdateDoc = InferSchemaType<typeof documentUpdateSchema> & MongooseDocument;
export const DocumentUpdateModel = model<DocumentUpdateDoc>('DocumentUpdate', documentUpdateSchema);