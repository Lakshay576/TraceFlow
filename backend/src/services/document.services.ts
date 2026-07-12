import { DocumentModel, canAccessDocument } from '../models/document.js';
import type { DocumentDoc } from '../models/document.js';
import { User } from '../models/user.js';
import { NotFoundError, ForbiddenError } from '../errors/index.js';
import type { CreateDocumentInput, ShareDocumentInput } from '../validators/document.schema.js';

export async function createDocument(
  ownerId: string,
  input: CreateDocumentInput
): Promise<DocumentDoc> {
  return DocumentModel.create({
    title: input.title,
    type: input.type,
    language: input.type === 'code' ? input.language ?? null : null,
    ownerId,
  });
}

/**
 * Lists documents the user owns OR collaborates on — a single query using
 * Mongo's $or, rather than two separate queries merged in application code.
 * Pushing the filter into the DB query means Mongo can use its indexes,
 * and we're not pulling more documents into memory than we need.
 */
export async function listDocumentsForUser(userId: string): Promise<DocumentDoc[]> {
  return DocumentModel.find({
    $or: [{ ownerId: userId }, { 'collaborators.userId': userId }],
  }).sort({ updatedAt: -1 });
}

async function findDocumentOrThrow(documentId: string): Promise<DocumentDoc> {
  const doc = await DocumentModel.findById(documentId);
  if (!doc) throw new NotFoundError('Document not found');
  return doc;
}

export async function getDocumentForUser(
  documentId: string,
  userId: string
): Promise<DocumentDoc> {
  const doc = await findDocumentOrThrow(documentId);

  if (!canAccessDocument(doc, userId, 'viewer')) {
    // Deliberately the same message/shape as NotFoundError, not a 403 with
    // "you're not allowed to see this" — confirming a document ID exists
    // to a user who can't access it is itself a small information leak.
    throw new NotFoundError('Document not found');
  }

  return doc;
}

export async function deleteDocument(documentId: string, userId: string): Promise<void> {
  const doc = await findDocumentOrThrow(documentId);

  if (!canAccessDocument(doc, userId, 'owner')) {
    throw new ForbiddenError('Only the document owner can delete it');
  }

  await doc.deleteOne();
}

/**
 * Sharing needs two independent pieces of data before it can proceed:
 * the document (to check the requester's permission) and the target
 * user (to resolve their email into an ID). Neither depends on the
 * other's result, so Promise.all runs both lookups concurrently instead
 * of paying their combined latency sequentially.
 */
export async function shareDocument(
  documentId: string,
  requesterId: string,
  input: ShareDocumentInput
): Promise<DocumentDoc> {
  const [doc, targetUser] = await Promise.all([
    findDocumentOrThrow(documentId),
    User.findOne({ email: input.email }),
  ]);

  if (!canAccessDocument(doc, requesterId, 'owner')) {
    throw new ForbiddenError('Only the document owner can share it');
  }

  if (!targetUser) {
    throw new NotFoundError('No user found with that email');
  }

  const targetUserId = targetUser._id.toString();

  if (doc.ownerId.toString() === targetUserId) {
    throw new ForbiddenError('Cannot share a document with its own owner');
  }

  const existing = doc.collaborators.find((c) => c.userId.toString() === targetUserId);

  if (existing) {
    existing.role = input.role;
  } else {
    doc.collaborators.push({ userId: targetUser._id, role: input.role });
  }

  await doc.save();
  return doc;
}