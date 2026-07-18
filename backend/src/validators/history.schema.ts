import { z } from 'zod';

export const documentIdOnlySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document id is required'),
  }),
});

export const replayQuerySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document id is required'),
  }),
  query: z.object({
    seq: z.coerce.number().int().nonnegative(),
    field: z.string().optional(),
  }),
});

export const createSnapshotSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document id is required'),
  }),
  body: z.object({
    label: z.string().max(200).optional(),
  }),
});