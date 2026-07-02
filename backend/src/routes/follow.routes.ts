import { Router } from 'express';
import {
  toggleFollow,
  checkFollowStatus,
  getFollowedSellers,
  getSellerFollowers,
} from '../controllers/follow.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../controllers/auth.controller';

const router = Router();

// All follow routes require auth
router.use((req, res, next) => {
  const payload = authenticate(req);
  if (!payload) return res.status(401).json({ success: false, message: 'Authentication required' });
  next();
});

/**
 * POST /api/follow/toggle
 * Toggle follow/unfollow a seller
 * Body: { sellerId: string }
 */
router.post('/toggle', asyncHandler(toggleFollow));

/**
 * GET /api/follow/status/:sellerId
 * Check if current buyer follows a seller
 */
router.get('/status/:sellerId', asyncHandler(checkFollowStatus));

/**
 * GET /api/follow/sellers
 * List sellers the current buyer follows
 */
router.get('/sellers', asyncHandler(getFollowedSellers));

/**
 * GET /api/follow/followers/:sellerId
 * List followers of a seller (seller only)
 */
router.get('/followers/:sellerId', asyncHandler(getSellerFollowers));

export default router;
