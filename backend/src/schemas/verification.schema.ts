import { z } from 'zod';

export const resendVerificationSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(100, 'Email is too long')
    .toLowerCase()
    .trim(),
});
