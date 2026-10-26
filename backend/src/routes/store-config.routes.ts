import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  getStoreConfig,
  updateStoreConfig,
  publishStoreConfig,
} from '../controllers/store-config.controller';

const router = Router();

/**
 * @route   GET /api/seller/store-config
 * @desc    Get current seller's store configuration
 * @access  Private (Seller only)
 */
router.get('/store-config', asyncHandler(getStoreConfig));

/**
 * @route   PATCH /api/seller/store-config
 * @desc    Update seller's draft store configuration
 * @access  Private (Seller only)
 */
router.patch('/store-config', asyncHandler(updateStoreConfig));

/**
 * @route   POST /api/seller/store-config/publish
 * @desc    Publish current draft as published configuration
 * @access  Private (Seller only)
 */
router.post('/store-config/publish', asyncHandler(publishStoreConfig));

export default router;
