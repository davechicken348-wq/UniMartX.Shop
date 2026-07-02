import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  getPublicSellerProfile,
  submitReview,
  getPublicStats,
  checkBuyerEmail,
  getTrendingProducts,
  getPublicStores,
  getPublicProducts,
  getPublicProductById,
  getProductReviews,
  contactSeller,
  publicContact,
} from '../controllers/public-seller.controller';

const router = Router();

/**
 * @route   GET /api/public/stats
 * @desc    Platform-wide counts (products, sellers, buyers)
 * @access  Public
 */
router.get('/stats', asyncHandler(getPublicStats));
router.get('/check-buyer-email', asyncHandler(checkBuyerEmail));

/**
 * @route   GET /api/public/products/trending
 * @desc    Top 8 active products by rating
 * @access  Public
 */
router.get('/products/trending', asyncHandler(getTrendingProducts));

/**
 * @route   GET /api/public/products
 * @desc    Paginated, filterable public product listing
 * @query   category, minPrice, maxPrice, sellerType, minRating, search, sort, page, limit
 * @access  Public
 */
router.get('/products', asyncHandler(getPublicProducts));

/**
 * @route   GET /api/public/products/:id
 * @desc    Full public product detail — images, seller, reviews, related
 * @access  Public
 */
router.get('/products/:id', asyncHandler(getPublicProductById));

/**
 * @route   GET /api/public/products/:id/reviews
 * @desc    Paginated reviews for a product
 * @access  Public
 */
router.get('/products/:id/reviews', asyncHandler(getProductReviews));

/**
 * @route   GET /api/public/stores
 * @desc    Paginated store listing with category/search/sort
 * @access  Public
 */
router.get('/stores', asyncHandler(getPublicStores));

/**
 * @route   GET /api/public/seller/:sellerId
 * @desc    Public seller profile — profile, stats, products, reviews
 * @access  Public (no auth required)
 */
router.get('/seller/:sellerId', asyncHandler(getPublicSellerProfile));

/**
 * @route   POST /api/public/reviews
 * @desc    Submit a review for a product
 * @access  Private (buyer only, not the seller of that product)
 */
router.post('/reviews', asyncHandler(submitReview));

/**
 * @route   POST /api/public/seller/:sellerId/contact
 * @desc    Send a contact message to a seller via email
 * @access  Public
 */
router.post('/seller/:sellerId/contact', asyncHandler(contactSeller));

/**
 * @route   POST /api/public/contact
 * @desc    Send a support contact form message to the UnimartX team
 * @access  Public
 */
router.post('/contact', asyncHandler(publicContact));

export default router;
