import { z } from 'zod';

// ── Query params for listing products ──
export const listProductsSchema = z.object({
  status: z.enum(['active', 'draft']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

// ── Body for toggling product status ──
export const toggleStatusSchema = z.object({
  isActive: z.coerce.boolean(),
});

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(100),
  description: z.string().min(1, 'Description is required').max(1000),
  price: z.coerce.number().positive('Price must be greater than 0'),
  category: z.enum([
    'electronics',
    'clothing',
    'books',
    'fashion',
    'food',
    'beauty',
    'sports',
    'home',
    'art',
    'other',
  ]),
  subcategory: z.string().optional().nullable(),
  stock: z.coerce.number().int().min(0, 'Stock must be a valid number'),
  condition: z.enum(['new', 'like-new', 'good', 'fair']).optional().nullable(),
  serviceType: z.string().optional().nullable(),
  tags: z.string()
    .transform(raw => {
      try { return JSON.parse(raw); } catch { return []; }
    })
    .pipe(z.array(z.string()).max(5))
    .optional(),
  comparePrice: z.coerce.number().nonnegative().optional().nullable(),
  costPrice: z.coerce.number().nonnegative().optional().nullable(),
  deliveryFee: z.coerce.number().nonnegative().optional().nullable(),
  fulfillment: z.enum(['pickup', 'delivery', 'both']).optional().nullable(),
  location: z.string().optional().nullable(),
  isActive: z.coerce.boolean().optional(),
  details: z.string()
    .transform(raw => {
      try { const parsed = JSON.parse(raw); return typeof parsed === 'object' && parsed !== null ? parsed : {}; } catch { return {}; }
    })
    .pipe(z.record(z.string(), z.string()))
    .optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
