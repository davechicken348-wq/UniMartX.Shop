import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../controllers/auth.controller';
import { z } from 'zod';

const createOptionSchema = z.object({
  name: z.string().min(1, 'Option name is required').max(40),
  values: z.array(z.string().min(1)).min(1, 'Add at least one value'),
  isRequired: z.boolean().optional(),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
});

const updateOptionSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  values: z.array(z.string().min(1)).min(1).optional(),
  isRequired: z.boolean().optional(),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
});

export const listProductOptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) throw new AppError('Authentication required', 401);

    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sellerId: true },
    });
    if (!product) throw new AppError('Product not found', 404);

    const seller = await prisma.seller.findUnique({
      where: { userId: userPayload.userId },
      select: { id: true },
    });
    if (!seller || product.sellerId !== seller.id) throw new AppError('Forbidden', 403);

    const options = await prisma.productOption.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({ success: true, data: options });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('listProductOptions error:', error);
    throw new AppError('Failed to fetch product options', 500);
  }
};

export const createProductOption = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) throw new AppError('Authentication required', 401);

    const { productId } = req.params;
    const body = createOptionSchema.parse(req.body);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sellerId: true },
    });
    if (!product) throw new AppError('Product not found', 404);

    const seller = await prisma.seller.findUnique({
      where: { userId: userPayload.userId },
      select: { id: true },
    });
    if (!seller || product.sellerId !== seller.id) throw new AppError('Forbidden', 403);

    const option = await prisma.productOption.create({
      data: {
        productId,
        name: body.name,
        values: body.values,
        isRequired: body.isRequired ?? false,
        sortOrder: body.sortOrder ?? 0,
      },
    });

    res.status(201).json({ success: true, data: option });
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof z.ZodError) {
      void res.status(400).json({ success: false, error: 'Validation failed', details: error.issues });
      return;
    }
    console.error('createProductOption error:', error);
    throw new AppError('Failed to create product option', 500);
  }
};

export const updateProductOption = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) throw new AppError('Authentication required', 401);

    const { productId, optionId } = req.params;
    const body = updateOptionSchema.parse(req.body);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sellerId: true },
    });
    if (!product) throw new AppError('Product not found', 404);

    const seller = await prisma.seller.findUnique({
      where: { userId: userPayload.userId },
      select: { id: true },
    });
    if (!seller || product.sellerId !== seller.id) throw new AppError('Forbidden', 403);

    const existing = await prisma.productOption.findUnique({
      where: { id: optionId },
      select: { id: true, productId: true },
    });
    if (!existing || existing.productId !== productId) {
      throw new AppError('Product option not found', 404);
    }

    const updated = await prisma.productOption.update({
      where: { id: optionId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.values !== undefined && { values: body.values }),
        ...(body.isRequired !== undefined && { isRequired: body.isRequired }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof z.ZodError) {
      void res.status(400).json({ success: false, error: 'Validation failed', details: error.issues });
      return;
    }
    console.error('updateProductOption error:', error);
    throw new AppError('Failed to update product option', 500);
  }
};

export const deleteProductOption = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) throw new AppError('Authentication required', 401);

    const { productId, optionId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sellerId: true },
    });
    if (!product) throw new AppError('Product not found', 404);

    const seller = await prisma.seller.findUnique({
      where: { userId: userPayload.userId },
      select: { id: true },
    });
    if (!seller || product.sellerId !== seller.id) throw new AppError('Forbidden', 403);

    const existing = await prisma.productOption.findUnique({
      where: { id: optionId },
      select: { id: true, productId: true },
    });
    if (!existing || existing.productId !== productId) {
      throw new AppError('Product option not found', 404);
    }

    await prisma.productOption.delete({ where: { id: optionId } });
    res.json({ success: true, message: 'Product option deleted' });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('deleteProductOption error:', error);
    throw new AppError('Failed to delete product option', 500);
  }
};
