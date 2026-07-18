import { Schema, model } from 'mongoose';
import type { Document as MongooseDocument, InferSchemaType, Types } from 'mongoose';

export type DocumentStatus = 'draft' | 'in_review' | 'approved' | 'archived';

const collaboratorSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['viewer', 'editor'], required: true },
  },
  { _id: false }
);

const documentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'code'], required: true, default: 'text' },
    // Only meaningful when type === 'code' — e.g. 'javascript', 'python'
    language: { type: String, default: null },
    status: {
      type: String,
      enum: ['draft', 'in_review', 'approved', 'archived'],
      default: 'draft',
    },
    statusHistory: {
  type: [
    {
      from: { type: String, required: true },
      to: { type: String, required: true },
      byUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      at: { type: Date, default: Date.now },
      _id: false,
    },
  ],
  default: [],
},
    collaborators: { type: [collaboratorSchema], default: [] },
    // Serialized Yjs document state — populated starting in Phase 3.
    // Buffer, not JSON: Yjs's binary encoding preserves CRDT metadata
    // (client IDs, causal ordering) that JSON can't represent losslessly.
    yjsState: { type: Buffer, default: null },
    updateSeqCounter: { type: Number, default: 0 },
    clientAttributions: {
  type: [
    {
      clientId: { type: Number, required: true },
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      _id: false,
    },
  ],
  default: [],
},
  },
  { timestamps: true }
);

export type DocumentDoc = InferSchemaType<typeof documentSchema> & MongooseDocument;
export const DocumentModel = model<DocumentDoc>('Document', documentSchema);

export type DocumentRole = 'owner' | 'editor' | 'viewer';

/**
 * Single source of truth for "can this user do X to this document" —
 * every route and socket handler that touches a document goes through
 * this instead of re-deriving the logic inline. Centralizing it here
 * means a permissions bug gets fixed in one place, not hunted down
 * across a dozen scattered `if` statements.
 */
export function getUserRole(doc: DocumentDoc, userId: string): DocumentRole | null {
  if (doc.ownerId.toString() === userId) return 'owner';

  const collaborator = doc.collaborators.find(
    (c: { userId: Types.ObjectId; role: string }) => c.userId.toString() === userId
  );

  return (collaborator?.role as DocumentRole) ?? null;
}

export function canAccessDocument(
  doc: DocumentDoc,
  userId: string,
  requiredRole: 'viewer' | 'editor' | 'owner' = 'viewer'
): boolean {
  const role = getUserRole(doc, userId);
  if (!role) return false;

  const rank: Record<DocumentRole, number> = { viewer: 1, editor: 2, owner: 3 };
  return rank[role] >= rank[requiredRole];
}