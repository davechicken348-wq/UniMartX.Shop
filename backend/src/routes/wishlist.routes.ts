import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { getWishlist, toggleWishlist, getWishlistIds } from '../controllers/wishlist.controller';

const router = Router();

/** GET /api/wishlist — full list with product details */
router.get('/', asyncHandler(getWishlist));

/** GET /api/wishlist/ids — just the saved product IDs */
router.get('/ids', asyncHandler(getWishlistIds));

/** POST /api/wishlist/toggle — add or remove a product */
router.post('/toggle', asyncHandler(toggleWishlist));

export default router;
