import { Router } from 'express';
import { validate } from '../middleware/validate';
import { registerSellerSchema } from '../schemas/auth.schema';
import { asyncHandler } from '../middleware/asyncHandler';
import { registerSeller } from '../controllers/seller-auth.controller';

const router = Router();

/**
 * @route   POST /api/seller-auth/register
 * @desc    Register a new seller account
 * @access  Public
 */
router.post('/register', validate(registerSellerSchema), asyncHandler(registerSeller));

export default router;
