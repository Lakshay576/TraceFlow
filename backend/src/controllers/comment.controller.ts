import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as commentService from '../services/comment.services.js';

interface DocumentParams {
  id: string;
}

interface CommentParams extends DocumentParams {
  commentId: string;
}

function serializeComment(entry: commentService.CommentWithResolvedPosition) {
  const { comment, currentStart, currentEnd } = entry;
  return {
    id: comment._id,
    documentId: comment.documentId,
    authorId: comment.authorId,
    text: comment.text,
    anchorField: comment.anchorField,
    resolved: comment.resolved,
    parentCommentId: comment.parentCommentId,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    currentPosition: { start: currentStart, end: currentEnd },
  };
}

export async function createCommentController(req: Request, res: Response) {
  const comment = await commentService.createComment(req.params.id as string, req.userId!, req.body);
  res.status(StatusCodes.CREATED).json({
    comment: serializeComment({ comment, currentStart: req.body.anchorStart, currentEnd: req.body.anchorEnd }),
  });
}

export async function listCommentsController(req: Request, res: Response) {
  const results = await commentService.listComments(req.params.id as string, req.userId!);
  res.status(StatusCodes.OK).json({ comments: results.map(serializeComment) });
}

export async function resolveCommentController(req: Request, res: Response) {
  const comment = await commentService.setCommentResolved(
    req.params.id as string,
    req.params.commentId as string,
    req.userId!,
    true
  );
  res.status(StatusCodes.OK).json({ comment });
}

export async function reopenCommentController(req: Request, res: Response) {
  const comment = await commentService.setCommentResolved(
    req.params.id as string,
    req.params.commentId as string,
    req.userId!,
    false
  );
  res.status(StatusCodes.OK).json({ comment });
}