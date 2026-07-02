import { Router } from 'express';
import { getCart, clearCart, addToCart, removeFromCart, updateCartItem } from '../controllers/cart.controller';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.get('/', asyncHandler(getCart));
router.post('/add', asyncHandler(addToCart));
router.put('/update/:itemId', asyncHandler(updateCartItem));
router.delete('/remove/:itemId', asyncHandler(removeFromCart));
router.post('/clear', asyncHandler(clearCart));

export default router;
