import { z } from 'zod';

export const promotionStatusSchema = z.enum(['active', 'scheduled', 'ended', 'draft']);

export const createPromotionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional().nullable(),
  type: z.enum(['percentage', 'fixed']),
  value: z.coerce.number().positive('Value must be positive'),
  target: z.enum(['store', 'selected']),
  productIds: z.array(z.string()).default([]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  noEndDate: z.boolean().default(false),
  status: z.enum(['draft', 'active', 'scheduled']).default('draft'),
});

export const updatePromotionSchema = createPromotionSchema.partial();

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;
