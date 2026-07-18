import { Schema, model } from 'mongoose';
import type { Document as MongooseDocument, InferSchemaType } from 'mongoose';

const snapshotSchema = new Schema({
  documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
  atSeq: { type: Number, required: true },
  yjsState: { type: Buffer, required: true },
  label: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

snapshotSchema.index({ documentId: 1, atSeq: -1 });

export type SnapshotDoc = InferSchemaType<typeof snapshotSchema> & MongooseDocument;
export const SnapshotModel = model<SnapshotDoc>('Snapshot', snapshotSchema);