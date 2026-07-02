import { Router } from 'express';
import { createOrder } from '../controllers/order.controller';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.post('/', asyncHandler(createOrder));

export default router;
