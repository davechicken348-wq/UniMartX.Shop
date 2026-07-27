import { z } from 'zod';

// Student-context signals that adapt the listing form for a category.
export const CATEGORY_SIGNALS = [
  'needsCourseCode',
  'isService',
  'isPerishable',
  'eventRelated',
  'needsCondition',
  'isDigital',
] as const;

export const createCategorySchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case, e.g. textbooks'),
  name: z.string().min(2).max(60),
  icon: z.string().max(40).optional(),
  description: z.string().max(200).optional(),
  signals: z.array(z.enum(CATEGORY_SIGNALS)).default([]),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(60).optional(),
  icon: z.string().max(40).optional(),
  description: z.string().max(200).optional(),
  signals: z.array(z.enum(CATEGORY_SIGNALS)).optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const createSubcategorySchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case'),
  name: z.string().min(2).max(60),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const updateSubcategorySchema = z.object({
  name: z.string().min(2).max(60).optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.coerce.boolean().optional(),
});

// Seller-proposed category (goes live immediately, flagged for review)
export const suggestCategorySchema = z.object({
  name: z
    .string()
    .min(2, 'Category name is too short')
    .max(60, 'Category name is too long')
    .regex(/^[\p{L}0-9 '&.\-/ ]+$/u, 'Use letters, numbers and spaces only'),
});
