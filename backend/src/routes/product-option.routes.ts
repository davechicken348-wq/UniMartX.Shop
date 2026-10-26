import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';
import {
  listProductOptions,
  createProductOption,
  updateProductOption,
  deleteProductOption,
} from '../controllers/product-option.controller';
import { createOptionSchema, updateOptionSchema } from '../schemas/product-option.schema';

const router = Router();

router.get('/products/:productId/options', asyncHandler(listProductOptions));
router.post('/products/:productId/options', validate(createOptionSchema), asyncHandler(createProductOption));
router.patch('/products/:productId/options/:optionId', validate(updateOptionSchema), asyncHandler(updateProductOption));
router.delete('/products/:productId/options/:optionId', asyncHandler(deleteProductOption));

export default router;
