import { Router } from 'express';
import { verifyEmail, redirectVerification, resendVerificationEmail } from '../controllers/verification.controller';
import { validate } from '../middleware/validate';
import { resendVerificationSchema } from '../schemas/verification.schema';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

/**
 * @route   GET /api/auth/verify/:token
 * @desc    Verify user's email address (API response)
 * @access  Public
 */
router.get('/verify/:token', asyncHandler(verifyEmail));

/**
 * @route   GET /api/auth/verify-redirect/:token
 * @desc    Validate token and redirect to frontend verification page with token in URL fragment
 * @access  Public
 */
router.get('/verify-redirect/:token', asyncHandler(redirectVerification));

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post('/resend-verification', validate(resendVerificationSchema), asyncHandler(resendVerificationEmail));

export default router;
