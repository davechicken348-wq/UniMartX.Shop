import { z } from 'zod';

export const createOptionSchema = z.object({
  name: z.string().min(1, 'Option name is required').max(40),
  values: z.array(z.string().min(1)).min(1, 'Add at least one value'),
  isRequired: z.boolean().optional(),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
});

export const updateOptionSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  values: z.array(z.string().min(1)).min(1).optional(),
  isRequired: z.boolean().optional(),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
});
