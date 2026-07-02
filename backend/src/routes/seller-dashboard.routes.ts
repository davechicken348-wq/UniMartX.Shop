import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { getSellerDashboard, getSellerOrders, getSellerOrder, updateSellerOrderStatus, getSellerRefunds, respondToRefund, getSellerRefundDetail } from '../controllers/seller-dashboard.controller';
import { getSellerProfile, updateSellerProfile } from '../controllers/seller-profile.controller';
import { validate } from '../middleware/validate';
import { updateProfileSchema } from '../schemas/seller-profile.schema';

const router = Router();

/**
 * @route   GET /api/seller/dashboard
 * @desc    Get all seller dashboard data
 * @access  Private (requires authentication)
 */
router.get('/dashboard', asyncHandler(getSellerDashboard));

/**
 * @route   GET /api/seller/orders?page&limit&status&search
 * @desc    Get paginated orders for seller with filtering
 * @access  Private (Seller only)
 */
router.get('/orders', asyncHandler(getSellerOrders));

/**
 * @route   GET /api/seller/orders/:id
 * @desc    Get single order details
 * @access  Private (Seller only)
 */
router.get('/orders/:id', asyncHandler(getSellerOrder));

/**
 * @route   PATCH /api/seller/orders/:id/status
 * @desc    Update order status
 * @access  Private (Seller only)
 */
router.patch('/orders/:id/status', asyncHandler(updateSellerOrderStatus));

/**
 * @route   GET /api/seller/refunds?page&limit&status
 * @desc    Get refunds for seller
 * @access  Private (Seller only)
 */
router.get('/refunds', asyncHandler(getSellerRefunds));

/**
 * @route   GET /api/seller/refunds/:orderId
 * @desc    Get single refund details for seller
 * @access  Private (Seller only)
 */
router.get('/refunds/:orderId', asyncHandler(getSellerRefundDetail));

/**
 * @route   POST /api/seller/refunds/:orderId/respond
 * @desc    Respond to a refund (approve/deny)
 * @access  Private (Seller only)
 */
router.post('/refunds/:orderId/respond', asyncHandler(respondToRefund));

/**
 * @route   GET /api/seller/profile
 * @desc    Get current seller's full profile
 * @access  Private (Seller only)
 */
router.get('/profile', asyncHandler(getSellerProfile));

/**
 * @route   PATCH /api/seller/profile
 * @desc    Update seller's profile
 * @access  Private (Seller only)
 */
router.patch('/profile', validate(updateProfileSchema), asyncHandler(updateSellerProfile));

export default router;
