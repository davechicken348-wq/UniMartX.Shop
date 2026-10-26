import { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { authenticate } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { createPromotionSchema, updatePromotionSchema, type CreatePromotionInput, type UpdatePromotionInput } from '../schemas/promotion.schema';

/**
 * GET /api/seller/promotions
 * Get all promotions for the authenticated seller with overview stats.
 */
export const getSellerPromotions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) throw new AppError('Authentication required', 401);

    const seller = await prisma.seller.findUnique({ where: { userId: userPayload.userId } });
    if (!seller) throw new AppError('Seller account not found', 404);

    const promotions = await prisma.promotion.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
    });

    const activeCount = promotions.filter(p => p.status === 'active').length;
    const ordersFromPromotions = promotions.reduce((sum, p) => sum + p.ordersCount, 0);
    const promotionRevenue = promotions.reduce((sum, p) => sum + parseFloat(p.revenue.toString()), 0);
    const savedByBuyers = ordersFromPromotions;

    res.status(200).json({
      success: true,
      data: {
        promotions,
        total: promotions.length,
        stats: {
          activeCount,
          ordersFromPromotions,
          promotionRevenue: Number(promotionRevenue.toFixed(2)),
          savedByBuyers,
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Get seller promotions error:', error);
    throw new AppError('Failed to fetch promotions', 500);
  }
};

/**
 * GET /api/seller/promotions/:id
 * Get a single promotion by ID.
 */
export const getSellerPromotion = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) throw new AppError('Authentication required', 401);

    const seller = await prisma.seller.findUnique({ where: { userId: userPayload.userId } });
    if (!seller) throw new AppError('Seller account not found', 404);

    const promotion = await prisma.promotion.findFirst({
      where: { id: req.params.id, sellerId: seller.id },
    });

    if (!promotion) throw new AppError('Promotion not found', 404);

    res.status(200).json({ success: true, data: promotion });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Get promotion error:', error);
    throw new AppError('Failed to fetch promotion', 500);
  }
};

/**
 * POST /api/seller/promotions
 * Create a new promotion.
 */
export const createPromotion = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) throw new AppError('Authentication required', 401);

    const seller = await prisma.seller.findUnique({ where: { userId: userPayload.userId } });
    if (!seller) throw new AppError('Seller account not found', 404);

    const body = req.body as CreatePromotionInput;

    const startDate = new Date(body.startDate);
    const endDate = body.noEndDate ? null : body.endDate ? new Date(body.endDate) : null;

    const promotion = await prisma.promotion.create({
      data: {
        sellerId: seller.id,
        name: body.name,
        description: body.description || null,
        type: body.type,
        value: body.value.toString(),
        target: body.target,
        productIds: body.target === 'selected' ? body.productIds : [],
        startDate,
        endDate,
        status: body.status,
      },
    });

    res.status(201).json({ success: true, data: promotion });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Create promotion error:', error);
    throw new AppError('Failed to create promotion', 500);
  }
};

/**
 * PUT /api/seller/promotions/:id
 * Update a promotion.
 */
export const updatePromotion = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) throw new AppError('Authentication required', 401);

    const seller = await prisma.seller.findUnique({ where: { userId: userPayload.userId } });
    if (!seller) throw new AppError('Seller account not found', 404);

    const existing = await prisma.promotion.findFirst({
      where: { id: req.params.id, sellerId: seller.id },
    });

    if (!existing) throw new AppError('Promotion not found', 404);

    const body = req.body as UpdatePromotionInput;

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.value !== undefined) updateData.value = body.value.toString();
    if (body.target !== undefined) {
      updateData.target = body.target;
      updateData.productIds = body.target === 'selected' ? (body.productIds || []) : [];
    }
    if (body.productIds !== undefined && body.target === 'selected') {
      updateData.productIds = body.productIds;
    }
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
    if (body.noEndDate !== undefined) {
      updateData.endDate = body.noEndDate ? null : (body.endDate ? new Date(body.endDate) : null);
    } else if (body.endDate !== undefined) {
      updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    }
    if (body.status !== undefined) updateData.status = body.status;

    const promotion = await prisma.promotion.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.status(200).json({ success: true, data: promotion });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Update promotion error:', error);
    throw new AppError('Failed to update promotion', 500);
  }
};

/**
 * DELETE /api/seller/promotions/:id
 * Delete a promotion.
 */
export const deletePromotion = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) throw new AppError('Authentication required', 401);

    const seller = await prisma.seller.findUnique({ where: { userId: userPayload.userId } });
    if (!seller) throw new AppError('Seller account not found', 404);

    const promotion = await prisma.promotion.findFirst({
      where: { id: req.params.id, sellerId: seller.id },
    });

    if (!promotion) throw new AppError('Promotion not found', 404);

    await prisma.promotion.delete({ where: { id: req.params.id } });

    res.status(200).json({ success: true, message: 'Promotion deleted' });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Delete promotion error:', error);
    throw new AppError('Failed to delete promotion', 500);
  }
};

/**
 * PATCH /api/seller/promotions/:id/status
 * Update promotion status (e.g. pause/activate).
 */
export const togglePromotionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) throw new AppError('Authentication required', 401);

    const seller = await prisma.seller.findUnique({ where: { userId: userPayload.userId } });
    if (!seller) throw new AppError('Seller account not found', 404);

    const { status } = req.body as { status: 'active' | 'scheduled' | 'ended' | 'draft' };

    if (!['active', 'scheduled', 'ended', 'draft'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    const promotion = await prisma.promotion.findFirst({
      where: { id: req.params.id, sellerId: seller.id },
    });

    if (!promotion) throw new AppError('Promotion not found', 404);

    const updated = await prisma.promotion.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Toggle promotion status error:', error);
    throw new AppError('Failed to update promotion status', 500);
  }
};

/**
 * POST /api/seller/promotions/:id/duplicate
 * Duplicate an existing promotion as a new draft.
 */
export const duplicatePromotion = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) throw new AppError('Authentication required', 401);

    const seller = await prisma.seller.findUnique({ where: { userId: userPayload.userId } });
    if (!seller) throw new AppError('Seller account not found', 404);

    const original = await prisma.promotion.findFirst({
      where: { id: req.params.id, sellerId: seller.id },
    });

    if (!original) throw new AppError('Promotion not found', 404);

    const copy = await prisma.promotion.create({
      data: {
        sellerId: seller.id,
        name: `${original.name} (Copy)`,
        description: original.description,
        type: original.type,
        value: original.value,
        target: original.target,
        productIds: original.productIds,
        startDate: original.startDate,
        endDate: original.endDate,
        status: 'draft',
        ordersCount: 0,
        revenue: 0,
      },
    });

    res.status(201).json({ success: true, data: copy });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Duplicate promotion error:', error);
    throw new AppError('Failed to duplicate promotion', 500);
  }
};
