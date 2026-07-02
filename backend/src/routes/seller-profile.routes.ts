import { Router } from 'express';
import {
  getSellerProfile,
  updateSellerProfile,
} from '../controllers/seller-profile.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';
import { updateProfileSchema } from '../schemas/seller-profile.schema';

const router = Router();

/**
 * @route   GET /api/seller/profile
 * @desc    Get current seller's full profile
 * @access  Private (Seller only)
 */
router.get('/profile', asyncHandler(getSellerProfile));

/**
 * @route   PATCH /api/seller/profile
 * @desc    Update seller's profile (user + store fields)
 * @access  Private (Seller only)
 */
router.patch('/profile', validate(updateProfileSchema), asyncHandler(updateSellerProfile));

export default router;
