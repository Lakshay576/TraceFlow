import { z } from 'zod';

export const createCommentSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document id is required'),
  }),
  body: z.object({
    text: z.string().min(1, 'Comment text is required').max(2000),
    anchorStart: z.number().int().nonnegative(),
    anchorEnd: z.number().int().nonnegative(),
    anchorField: z.string().default('content'),
    parentCommentId: z.string().optional(),
  }),
});

export const documentAndCommentIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document id is required'),
    commentId: z.string().min(1, 'Comment id is required'),
  }),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>['body'];