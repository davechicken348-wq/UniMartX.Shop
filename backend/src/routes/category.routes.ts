import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';
import { requireAdmin } from '../middleware/requireAdmin';
import {
  createCategorySchema,
  updateCategorySchema,
  createSubcategorySchema,
  updateSubcategorySchema,
  suggestCategorySchema,
} from '../schemas/category.schema';
import {
  getCategories,
  getCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  suggestCategory,
  getSuggestedCategories,
  reviewCategory,
} from '../controllers/category.controller';

const router = Router();

// Public category tree (used by the seller listing form + shop filters)
router.get('/', asyncHandler(getCategories));

// Sellers propose a new category (auth required, goes live immediately)
router.post('/suggest', validate(suggestCategorySchema), asyncHandler(suggestCategory));

// Admin management (requires admin session)
router.use(requireAdmin);
router.get('/admin', asyncHandler(getCategoriesAdmin));
router.get('/suggested', asyncHandler(getSuggestedCategories));
router.post('/', validate(createCategorySchema), asyncHandler(createCategory));
router.patch('/:id', validate(updateCategorySchema), asyncHandler(updateCategory));
router.patch('/:id/review', asyncHandler(reviewCategory));
router.delete('/:id', asyncHandler(deleteCategory));
router.post('/:id/subcategories', validate(createSubcategorySchema), asyncHandler(createSubcategory));
router.patch('/subcategories/:id', validate(updateSubcategorySchema), asyncHandler(updateSubcategory));
router.delete('/subcategories/:id', asyncHandler(deleteSubcategory));

export default router;
