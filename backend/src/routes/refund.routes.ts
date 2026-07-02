import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAdmin } from '../middleware/requireAdmin';
import {
  getAdminRefunds,
  getAdminRefundDetail,
  arbitrateRefund,
} from '../controllers/refund.controller';

const router = Router();
router.use(requireAdmin);

/**
 * @route   GET /api/refunds?filter&page&limit
 * @desc    Get refunds for admin view (filtered by status)
 * @access  Private (Admin)
 */
router.get('/', asyncHandler(getAdminRefunds));

/**
 * @route   GET /api/refunds/:orderId
 * @desc    Get single refund detail for admin
 * @access  Private (Admin)
 */
router.get('/:orderId', asyncHandler(getAdminRefundDetail));

/**
 * @route   POST /api/refunds/orders/:orderId/refund/arbitrate
 * @desc    Admin arbitrates a refund (approve/deny)
 * @access  Private (Admin)
 */
router.post('/orders/:orderId/refund/arbitrate', asyncHandler(arbitrateRefund));

export default router;
