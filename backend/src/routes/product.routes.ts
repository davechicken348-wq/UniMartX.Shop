import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { asyncHandler } from '../middleware/asyncHandler';
import { createProduct, listProducts, deleteProduct, getProductById, toggleProductStatus, updateProduct } from '../controllers/product.controller';
import { listProductsSchema } from '../schemas/product.schema';
import path from 'path';
import { mkdirSync, existsSync } from 'fs';

const router = Router();

// ── Uploads directory (inside backend/) ──
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '').replace(/\s+/g, '-');
    cb(null, `product-${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
  fileFilter: (_req, file, cb) => {
    const type = file.mimetype.split('/')[0];
    cb(null, type === 'image' || file.mimetype === 'image/svg+xml');
  },
});

// ── Query-param validator ──
function validateQuery(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = (schema as any).safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: parsed.error.issues.map((i: any) => ({ field: i.path.join('.'), message: i.message })),
      });
    }
    req.query = parsed.data as any;
    next();
  };
}

/**
 * @route   POST /api/seller/products
 * @desc    Create a new product listing (multipart/form-data)
 * @access  Private (authenticated sellers only)
 */
router.post(
  '/products',
  upload.array('images', 5),
  asyncHandler((req: Request, res: Response) => createProduct(req, res)),
);

/**
 * @route   GET /api/seller/products
 * @desc    List all products for the authenticated seller
 * @query   status=active|draft  search=string  page=number  limit=number
 * @access  Private
 */
router.get(
  '/products',
  validateQuery(listProductsSchema),
  asyncHandler((req: Request, res: Response) => listProducts(req, res)),
);

/**
 * @route   PUT /api/seller/products/:id
 * @desc    Update an existing product listing
 * @access  Private (owner only)
 */
router.put(
  '/products/:id',
  upload.array('images', 5),
  asyncHandler((req: Request, res: Response) => updateProduct(req, res)),
);

/**
 * @route   DELETE /api/seller/products/:id
 * @desc    Permanently delete a product
 * @access  Private (owner only)
 */
router.delete(
  '/products/:id',
  asyncHandler((req: Request, res: Response) => deleteProduct(req, res)),
);

/**
 * @route   GET /api/seller/products/:id
 * @desc    Fetch a single product with stats, recent orders, and reviews
 * @query   includeStats=true|false  includeOrders=true|false  includeReviews=true|false
 * @access  Private (owner only)
 */
router.get(
  '/products/:id',
  asyncHandler((req: Request, res: Response) => getProductById(req, res)),
);

/**
 * @route   PATCH /api/seller/products/:id/toggle
 * @desc    Toggle active / draft status
 * @body    { isActive: boolean }
 * @access  Private (owner only)
 */
router.patch(
  '/products/:id/toggle',
  asyncHandler((req: Request, res: Response) => toggleProductStatus(req, res)),
);

export default router;
