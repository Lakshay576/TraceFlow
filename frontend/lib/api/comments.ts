import { apiRequest } from './client ';

export interface CommentPosition {
  start: number | null;
  end: number | null;
}

export interface CollabComment {
  id: string;
  documentId: string;
  authorId: string;
  text: string;
  anchorField: string;
  resolved: boolean;
  parentCommentId: string | null;
  createdAt: string;
  updatedAt: string;
  currentPosition: CommentPosition;
}

export function listComments(documentId: string): Promise<{ comments: CollabComment[] }> {
  return apiRequest(`/api/documents/${documentId}/comments`);
}

export function createComment(
  documentId: string,
  text: string,
  anchorStart: number,
  anchorEnd: number,
  parentCommentId?: string
): Promise<{ comment: CollabComment }> {
  return apiRequest(`/api/documents/${documentId}/comments`, {
    method: 'POST',
    body: { text, anchorStart, anchorEnd, anchorField: 'content', parentCommentId },
  });
}

export function resolveComment(documentId: string, commentId: string): Promise<{ comment: CollabComment }> {
  return apiRequest(`/api/documents/${documentId}/comments/${commentId}/resolve`, { method: 'PATCH' });
}

export function reopenComment(documentId: string, commentId: string): Promise<{ comment: CollabComment }> {
  return apiRequest(`/api/documents/${documentId}/comments/${commentId}/reopen`, { method: 'PATCH' });
}