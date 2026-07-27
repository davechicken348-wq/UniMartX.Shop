import type { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../controllers/auth.controller';
import {
  createCategorySchema,
  updateCategorySchema,
  createSubcategorySchema,
  updateSubcategorySchema,
  suggestCategorySchema,
} from '../schemas/category.schema';

/**
 * @route   GET /api/categories
 * @desc    Student-aware category tree (active categories + their subcategories)
 * @access  Public
 */
export async function getCategories(_req: Request, res: Response, _next: NextFunction) {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      subcategories: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, slug: true, name: true },
      },
    },
  });

  res.json({
    success: true,
    data: categories.map(c => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      icon: c.icon,
      description: c.description,
      signals: c.signals,
      subcategories: c.subcategories,
    })),
  });
}

/**
 * @route   GET /api/categories/admin
 * @desc    Full category list (incl. inactive) for admin management
 * @access  Admin
 */
export async function getCategoriesAdmin(_req: Request, res: Response, _next: NextFunction) {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      subcategories: { orderBy: { sortOrder: 'asc' } },
    },
  });
  res.json({ success: true, data: categories });
}

/**
 * @route   POST /api/categories
 * @desc    Create a category
 * @access  Admin
 */
export async function createCategory(req: Request, res: Response, _next: NextFunction) {
  const body = createCategorySchema.parse(req.body);
  const exists = await prisma.category.findUnique({ where: { slug: body.slug } });
  if (exists) throw new AppError('A category with that slug already exists', 409);

  const category = await prisma.category.create({
    data: {
      slug: body.slug,
      name: body.name,
      icon: body.icon,
      description: body.description,
      signals: body.signals,
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive ?? true,
    },
  });
  res.status(201).json({ success: true, data: category });
}

/**
 * @route   PATCH /api/categories/:id
 * @desc    Update a category
 * @access  Admin
 */
export async function updateCategory(req: Request, res: Response, _next: NextFunction) {
  const id = req.params.id;
  const body = updateCategorySchema.parse(req.body);
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new AppError('Category not found', 404);

  const updated = await prisma.category.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.icon !== undefined && { icon: body.icon }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.signals !== undefined && { signals: body.signals }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });
  res.json({ success: true, data: updated });
}

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete a category (cascade removes subcategories)
 * @access  Admin
 */
export async function deleteCategory(req: Request, res: Response, _next: NextFunction) {
  const id = req.params.id;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new AppError('Category not found', 404);
  await prisma.category.delete({ where: { id } });
  res.json({ success: true, message: 'Category deleted' });
}

/**
 * @route   POST /api/categories/:id/subcategories
 * @desc    Create a subcategory under a category
 * @access  Admin
 */
export async function createSubcategory(req: Request, res: Response, _next: NextFunction) {
  const categoryId = req.params.id;
  const body = createSubcategorySchema.parse(req.body);

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new AppError('Category not found', 404);

  const dup = await prisma.subcategory.findFirst({
    where: { categoryId, slug: body.slug },
  });
  if (dup) throw new AppError('A subcategory with that slug already exists in this category', 409);

  const sub = await prisma.subcategory.create({
    data: {
      categoryId,
      slug: body.slug,
      name: body.name,
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive ?? true,
    },
  });
  res.status(201).json({ success: true, data: sub });
}

/**
 * @route   PATCH /api/subcategories/:id
 * @desc    Update a subcategory
 * @access  Admin
 */
export async function updateSubcategory(req: Request, res: Response, _next: NextFunction) {
  const id = req.params.id;
  const body = updateSubcategorySchema.parse(req.body);
  const sub = await prisma.subcategory.findUnique({ where: { id } });
  if (!sub) throw new AppError('Subcategory not found', 404);

  const updated = await prisma.subcategory.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });
  res.json({ success: true, data: updated });
}

/**
 * @route   DELETE /api/subcategories/:id
 * @desc    Delete a subcategory
 * @access  Admin
 */
export async function deleteSubcategory(req: Request, res: Response, _next: NextFunction) {
  const id = req.params.id;
  const sub = await prisma.subcategory.findUnique({ where: { id } });
  if (!sub) throw new AppError('Subcategory not found', 404);
  await prisma.subcategory.delete({ where: { id } });
  res.json({ success: true, message: 'Subcategory deleted' });
}

/**
 * Slugify a human-entered category name into a URL/DB-safe kebab-case slug.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/**
 * @route   POST /api/categories/suggest
 * @desc    Sellers propose a new category. It goes live immediately
 *          (status: pending_review) so the seller isn't blocked, but is
 *          flagged for admin review/merge. Deduped against existing slugs/names.
 * @access  Authenticated sellers
 */
export async function suggestCategory(req: Request, res: Response, _next: NextFunction) {
  const userPayload = authenticate(req);
  if (!userPayload) throw new AppError('Authentication required', 401);
  if (userPayload.role !== 'seller' && userPayload.role !== 'admin') {
    throw new AppError('Only sellers can propose categories', 403);
  }

  const body = suggestCategorySchema.parse(req.body);
  const name = body.name.trim().replace(/\s+/g, ' ');
  const slug = slugify(name);

  // ── Dedupe: exact slug or very similar existing name ──
  const existing = await prisma.category.findFirst({
    where: {
      OR: [
        { slug },
        { name: { equals: name, mode: 'insensitive' } },
      ],
    },
  });
  if (existing) {
    // Return the existing one so the seller just uses it
    return res.status(200).json({
      success: true,
      data: existing,
      message: 'This category already exists — using the existing one.',
    });
  }

  // ── Rate limit: max 5 new categories per seller per day ──
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentCount = await prisma.category.count({
    where: { createdBy: userPayload.userId, createdAt: { gte: since } },
  });
  if (recentCount >= 5) {
    throw new AppError('You can propose up to 5 new categories per day. Try again tomorrow.', 429);
  }

  const category = await prisma.category.create({
    data: {
      slug,
      name,
      icon: 'tag',
      sellerCreated: true,
      status: 'pending_review',
      createdBy: userPayload.userId,
      sortOrder: 999,
    },
  });

  res.status(201).json({
    success: true,
    data: category,
    message: 'Category added! It will be reviewed shortly to keep the marketplace tidy.',
  });
}

/**
 * @route   GET /api/categories/suggested
 * @desc    Admin queue of seller-proposed categories
 * @access  Admin
 */
export async function getSuggestedCategories(_req: Request, res: Response, _next: NextFunction) {
  const categories = await prisma.category.findMany({
    where: { sellerCreated: true },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { products: true } } },
  });
  res.json({ success: true, data: categories });
}

/**
 * @route   PATCH /api/categories/:id/review
 * @desc    Admin reviews a suggested category: approve (active), disable, or merge.
 *          mergeInto moves the category's products to another and deletes it.
 * @access  Admin
 */
export async function reviewCategory(req: Request, res: Response, _next: NextFunction) {
  const id = req.params.id;
  const { action, mergeInto } = req.body as { action?: string; mergeInto?: string };

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new AppError('Category not found', 404);

  if (action === 'approve') {
    const updated = await prisma.category.update({
      where: { id },
      data: { status: 'active', isActive: true },
    });
    return res.json({ success: true, data: updated });
  }

  if (action === 'disable') {
    const updated = await prisma.category.update({
      where: { id },
      data: { status: 'disabled', isActive: false },
    });
    return res.json({ success: true, data: updated });
  }

  if (action === 'merge') {
    if (!mergeInto || mergeInto === id) throw new AppError('A valid target category is required to merge', 400);
    const target = await prisma.category.findUnique({ where: { id: mergeInto } });
    if (!target) throw new AppError('Target category not found', 404);
    // Re-point products, then remove the suggested category
    await prisma.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: mergeInto, category: target.slug },
    });
    await prisma.category.delete({ where: { id } });
    return res.json({ success: true, message: 'Merged and removed.' });
  }

  throw new AppError("action must be 'approve', 'disable' or 'merge'", 400);
}
