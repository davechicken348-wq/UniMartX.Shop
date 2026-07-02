import { Router } from 'express';
import multer from 'multer';
import { getBuyerDashboard, getBuyerOrders, getBuyerLatestOrder, getBuyerOrder, requestRefund } from '../controllers/dashboard.controller';
import { getBuyerRefundDetails, confirmRefundReceipt, disputeRefund } from '../controllers/refund.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import path from 'path';
import { mkdirSync, existsSync } from 'fs';

const router = Router();

// ── Uploads directory ──
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '').replace(/\s+/g, '-');
    cb(null, `product-${Date.now()}-${safe}`);
  },
});

const refundUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/') || file.mimetype === 'image/svg+xml');
  },
});

/**
 * @route   GET /api/buyer/dashboard
 * @desc    Get buyer dashboard data (stats, recent orders)
 * @access  Private
 */
router.get('/dashboard', asyncHandler(getBuyerDashboard));

/**
 * @route   GET /api/buyer/orders
 * @desc    Get paginated orders for buyer with filtering
 * @access  Private
 */
router.get('/orders', asyncHandler(getBuyerOrders));

/**
 * @route   GET /api/buyer/orders/latest
 * @desc    Get the most recent order for the buyer
 * @access  Private
 */
router.get('/orders/latest', asyncHandler(getBuyerLatestOrder));

/**
 * @route   GET /api/buyer/orders/:id/refund
 * @desc    Get refund details for an order
 * @access  Private (Buyer)
 */
router.get('/orders/:id/refund', asyncHandler(getBuyerRefundDetails));

/**
 * @route   GET /api/buyer/orders/:id
 * @desc    Get single order details
 * @access  Private
 */
router.get('/orders/:id', asyncHandler(getBuyerOrder));

/**
 * @route   POST /api/buyer/orders/:id/refund
 * @desc    Request a refund for an order
 * @access  Private
 */
router.post('/orders/:id/refund', refundUpload.array('evidence', 3), asyncHandler(requestRefund));

/**
 * @route   POST /api/buyer/orders/:id/refund/confirm
 * @desc    Buyer confirms receipt of refund
 * @access  Private (Buyer)
 */
router.post('/orders/:id/refund/confirm', asyncHandler(confirmRefundReceipt));

/**
 * @route   POST /api/buyer/orders/:id/refund/dispute
 * @desc    Buyer disputes a refund decision
 * @access  Private (Buyer)
 */
router.post('/orders/:id/refund/dispute', asyncHandler(disputeRefund));

export default router;
