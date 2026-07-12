import { z } from 'zod';

export const createDocumentSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200),
    type: z.enum(['text', 'code']).default('text'),
    language: z.string().max(50).optional(),
  }),
});

export const documentIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document id is required'),
  }),
});

export const shareDocumentSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document id is required'),
  }),
  body: z.object({
    email: z.string().email('Must be a valid email address'),
    role: z.enum(['viewer', 'editor']),
  }),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>['body'];
export type ShareDocumentInput = z.infer<typeof shareDocumentSchema>['body'];