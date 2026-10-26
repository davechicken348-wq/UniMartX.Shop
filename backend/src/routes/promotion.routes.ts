import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../controllers/auth.controller';
import {
  getSellerPromotions,
  getSellerPromotion,
  createPromotion,
  updatePromotion,
  deletePromotion,
  togglePromotionStatus,
  duplicatePromotion,
} from '../controllers/promotion.controller';
import { validate } from '../middleware/validate';
import { createPromotionSchema, updatePromotionSchema } from '../schemas/promotion.schema';

const router = Router();

// All promotion routes require auth
router.use((req, res, next) => {
  const payload = authenticate(req);
  if (!payload) return res.status(401).json({ success: false, message: 'Authentication required' });
  next();
});

/**
 * GET /api/seller/promotions
 * List all promotions for the authenticated seller
 */
router.get('/promotions', asyncHandler(getSellerPromotions));

/**
 * GET /api/seller/promotions/:id
 * Get a single promotion
 */
router.get('/promotions/:id', asyncHandler(getSellerPromotion));

/**
 * POST /api/seller/promotions
 * Create a new promotion
 */
router.post('/promotions', validate(createPromotionSchema), asyncHandler(createPromotion));

/**
 * PUT /api/seller/promotions/:id
 * Update a promotion
 */
router.put('/promotions/:id', validate(updatePromotionSchema), asyncHandler(updatePromotion));

/**
 * DELETE /api/seller/promotions/:id
 * Delete a promotion
 */
router.delete('/promotions/:id', asyncHandler(deletePromotion));

/**
 * PATCH /api/seller/promotions/:id/status
 * Update promotion status
 */
router.patch('/promotions/:id/status', asyncHandler(togglePromotionStatus));

/**
 * POST /api/seller/promotions/:id/duplicate
 * Duplicate a promotion as a new draft
 */
router.post('/promotions/:id/duplicate', asyncHandler(duplicatePromotion));

export default router;
