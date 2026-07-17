import { Schema, model } from 'mongoose';
import type { Document as MongooseDocument, InferSchemaType } from 'mongoose';

const commentSchema = new Schema(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true },
    anchorStart: { type: Buffer, required: true },
    anchorEnd: { type: Buffer, required: true },
    anchorField: { type: String, default: 'content' },
    resolved: { type: Boolean, default: false },
    parentCommentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
  },
  { timestamps: true }
);

export type CommentDoc = InferSchemaType<typeof commentSchema> & MongooseDocument;
export const CommentModel = model<CommentDoc>('Comment', commentSchema);