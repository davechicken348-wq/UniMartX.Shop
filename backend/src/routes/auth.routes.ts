import { Router } from 'express';
import { registerBuyer, login, getCurrentUser, updateProfile, updateAddress, forgotPassword, resetPassword, redirectForgotPassword, logout } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { registerBuyerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/auth.schema';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

/**
 * @route   POST /api/auth/register/buyer
 * @desc    Register a new buyer account
 * @access  Public
 */
router.post('/register/buyer', validate(registerBuyerSchema), asyncHandler(registerBuyer));

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get JWT token
 * @access  Public
 */
router.post('/login', validate(loginSchema), asyncHandler(login));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and destroy session
 * @access  Private
 */
router.post('/logout', asyncHandler(logout));

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user info
 * @access  Private
 */
router.get('/me', asyncHandler(getCurrentUser));

/**
 * @route   PATCH /api/auth/me
 * @desc    Update current user's profile
 * @access  Private
 */
router.patch('/me', asyncHandler(updateProfile));

/**
 * @route   PATCH /api/auth/me/address
 * @desc    Update or create user's default address
 * @access  Private
 */
router.patch('/me/address', asyncHandler(updateAddress));

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset link
 * @access  Public
 */
router.post('/forgot-password', validate(forgotPasswordSchema), asyncHandler(forgotPassword));

/**
 * @route   GET /api/auth/forgot-password-redirect/:token
 * @desc    Validate reset token and redirect to frontend with token in fragment
 * @access  Public
 */
router.get('/forgot-password-redirect/:token', asyncHandler(redirectForgotPassword));

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
router.post('/reset-password', validate(resetPasswordSchema), asyncHandler(resetPassword));

export default router;
