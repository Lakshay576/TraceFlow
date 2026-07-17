import { CommentModel } from '../models/comment.js';
import type { CommentDoc } from '../models/comment.js';
import { getDocumentForUser } from './document.services.js';
import { canAccessDocument } from '../models/document.js';
import { getOrLoadDoc } from '../socket/yjsDocManager.js';
import { encodeAnchor, decodeAnchor } from './anchor.services.js';
import { ForbiddenError, NotFoundError } from '../errors/index.js';
import type { CreateCommentInput } from '../validators/comment.schema.js';

export interface CommentWithResolvedPosition {
  comment: CommentDoc;
  currentStart: number | null;
  currentEnd: number | null;
}

export async function createComment(
  documentId: string,
  authorId: string,
  input: CreateCommentInput
): Promise<CommentDoc> {
  const doc = await getDocumentForUser(documentId, authorId);

  if (!canAccessDocument(doc, authorId, 'viewer')) {
    throw new ForbiddenError('You do not have access to comment on this document');
  }

  const yDoc = await getOrLoadDoc(documentId);
  const ytext = yDoc.getText(input.anchorField);

  const anchorStart = encodeAnchor(ytext, input.anchorStart);
  const anchorEnd = encodeAnchor(ytext, input.anchorEnd);

  return CommentModel.create({
    documentId,
    authorId,
    text: input.text,
    anchorStart,
    anchorEnd,
    anchorField: input.anchorField,
    parentCommentId: input.parentCommentId ?? null,
  });
}

export async function listComments(
  documentId: string,
  userId: string
): Promise<CommentWithResolvedPosition[]> {
  const doc = await getDocumentForUser(documentId, userId);

  if (!canAccessDocument(doc, userId, 'viewer')) {
    throw new ForbiddenError('You do not have access to view comments on this document');
  }

  const [comments, yDoc] = await Promise.all([
    CommentModel.find({ documentId }).sort({ createdAt: 1 }),
    getOrLoadDoc(documentId),
  ]);

  return comments.map((comment) => ({
    comment,
    currentStart: decodeAnchor(yDoc, comment.anchorStart as unknown as Buffer),
    currentEnd: decodeAnchor(yDoc, comment.anchorEnd as unknown as Buffer),
  }));
}

async function findCommentOrThrow(documentId: string, commentId: string): Promise<CommentDoc> {
  const comment = await CommentModel.findOne({ _id: commentId, documentId });
  if (!comment) throw new NotFoundError('Comment not found');
  return comment;
}

export async function setCommentResolved(
  documentId: string,
  commentId: string,
  userId: string,
  resolved: boolean
): Promise<CommentDoc> {
  const [doc, comment] = await Promise.all([
    getDocumentForUser(documentId, userId),
    findCommentOrThrow(documentId, commentId),
  ]);

  const isAuthor = comment.authorId.toString() === userId;
  if (!isAuthor && !canAccessDocument(doc, userId, 'editor')) {
    throw new ForbiddenError('You do not have permission to resolve this comment');
  }

  comment.resolved = resolved;
  await comment.save();
  return comment;
}