import { z } from 'zod';

/**
 * Why Zod: this schema does double duty. It validates the request body at
 * runtime (rejecting bad input before it ever reaches business logic), AND
 * `z.infer<>` derives a TypeScript type from the same definition — so the
 * validation rule and the type can never silently drift apart, which is a
 * real risk when you write a TS interface and a validation check separately.
 */
export const signupSchema = z.object({
  body: z.object({
    email: z.string().email('Must be a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(1, 'Name is required').max(100),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Must be a valid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export type SignupInput = z.infer<typeof signupSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];