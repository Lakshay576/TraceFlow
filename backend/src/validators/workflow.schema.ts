import { z } from 'zod';

export const transitionDocumentSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document id is required'),
  }),
  body: z.object({
    status: z.enum(['draft', 'in_review', 'approved', 'archived']),
  }),
});

export type TransitionDocumentInput = z.infer<typeof transitionDocumentSchema>['body'];