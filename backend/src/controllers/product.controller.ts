import { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { listProductsSchema, toggleStatusSchema } from '../schemas/product.schema';
import { createProductSchema, type CreateProductInput } from '../schemas/product.schema';
import { authenticate } from '../controllers/auth.controller';

/** GET /api/seller/products/admin/stats — admin-only product KPIs */
export const adminProductStats = async (_req: Request, res: Response): Promise<void> => {
  const [total, active, lowStock] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { stock: { lte: 5 } } }),
  ]);
  res.json({ success: true, data: { total, active, inactive: total - active, lowStock } });
};

/** GET /api/seller/products/admin?page&limit&isActive&category&search — all products */
export const adminListProducts = async (req: Request, res: Response): Promise<void> => {
  const page     = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit    = Math.min(100, parseInt(req.query.limit as string) || 18);
  const skip     = (page - 1) * limit;
  const isActive = req.query.isActive as string;
  const category = req.query.category as string;
  const search   = req.query.search   as string;

  const where: any = {};
  if (isActive === 'true')  where.isActive = true;
  if (isActive === 'false') where.isActive = false;
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { name:        { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, description: true, price: true,
        category: true, subcategory: true, stock: true, image: true,
        isActive: true, rating: true, reviewCount: true,
        createdAt: true, updatedAt: true,
        seller: { select: { storeName: true, user: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const data = products.map((p: any) => ({ ...p, image: absUrl(p.image) }));
  res.json({ success: true, data: { products: data, total, pages: Math.ceil(total / limit), page } });
};

/** PATCH /api/seller/products/admin/:id/toggle — toggle any product's status */
export const adminToggleProduct = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') throw new AppError('Invalid status payload', 400);
  const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!product) throw new AppError('Product not found', 404);
  const updated = await prisma.product.update({ where: { id }, data: { isActive }, select: { id: true, isActive: true } });
  res.json({ success: true, data: updated });
};

/** DELETE /api/seller/products/admin/:id — delete any product */
export const adminDeleteProduct = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!product) throw new AppError('Product not found', 404);
  await prisma.product.delete({ where: { id } });
  res.json({ success: true, message: 'Product deleted' });
};

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

function absUrl(path: string | null | undefined): string | null {
  const p = path || '';
  if (!p) return null;
  // Reject directory paths to avoid serving HTML index files as images
  if (p.endsWith('/')) return null;
  // Encode relative /uploads/* paths as proper absolute URLs
  if (p.startsWith('/uploads')) {
    try {
      return new URL(p, BACKEND_URL).href;
    } catch {
      return `${BACKEND_URL}${p}`;
    }
  }
  if (/^https?:/.test(p) || p.startsWith('data:') || p.startsWith('blob:')) return p;
  return `${BACKEND_URL}${p}`;
}

/**
 * POST /api/seller/products
 * Create a new product listing for the authenticated seller.
 *
 * Accepts multipart/form-data.  Text fields arrive in req.body (as strings).
 * Uploaded image files arrive on req.files from multer.
 */
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    // Parse & validate the text fields
    const fields = req.body;
    const parsed = createProductSchema.safeParse(fields);
    if (!parsed.success) {
      const messages = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n');
      throw new AppError(messages || 'Invalid product data', 400);
    }
    const input: CreateProductInput = parsed.data;

    // Confirm the user has an active seller account
    const seller = await prisma.seller.findUnique({
      where: { userId: userPayload.userId },
      select: { id: true, storeName: true },
    });

    if (!seller) {
      throw new AppError('Seller account not found. Please register as a seller.', 404);
    }

    // Collect uploaded image URLs
    const files = (req as any).files as File[] | undefined;
    let imageUrls: string[] = [];

    if (files && files.length > 0) {
      imageUrls = files.map(f => `/uploads/${(f as any).filename}`);
    }

    // Fallback: plain JSON placeholder strings (for dev/testing without upload)
    if (imageUrls.length === 0 && Array.isArray(fields.images)) {
      imageUrls = fields.images.filter(Boolean);
    }

    if (imageUrls.length === 0) {
      throw new AppError('At least one product image is required', 400);
    }

    const coverImage     = imageUrls.length > 0 ? imageUrls[0] : null;
    const additionalImgs = imageUrls.length > 0 ? imageUrls.slice(1) : [];

    // ── Build Prisma create payload ──
    const createData: any = {
      sellerId: seller.id,
      name: input.name,
      description: input.description,
      price: input.price,
      category: input.category,
      subcategory: input.subcategory || null,
      stock: input.stock,
      isActive: input.isActive ?? false,
    };

    createData.image  = imageUrls[0];
    createData.images = imageUrls.slice(1);

    if (input.condition) createData.condition = input.condition;
    if (input.tags) createData.tags = input.tags;
    if (input.comparePrice !== undefined && input.comparePrice !== null)
      createData.comparePrice = input.comparePrice;
    if (input.costPrice !== undefined && input.costPrice !== null)
      createData.costPrice = input.costPrice;

    // Store fulfillment + location inside details JSON so they survive round-trips
    const detailsObj: Record<string, any> = typeof input.details === 'object' && input.details !== null
      ? { ...(input.details as object) }
      : {};
    if (input.fulfillment) detailsObj._fulfillment = input.fulfillment;
    if (input.location)    detailsObj._location    = input.location;
    createData.details = detailsObj;

    const product = await prisma.product.create({
      data: createData,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        subcategory: true,
        stock: true,
        image: true,
        serviceType: true,
        details: true,
        images: true,
        isActive: true,
        condition: true,
        tags: true,
        comparePrice: true,
        costPrice: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const result: any = { ...product, image: absUrl(product.image), serviceType: product.serviceType, details: product.details };
    if (Array.isArray(product.images)) {
      result.images = product.images.map(absUrl);
    }
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('createProduct error:', error);
    throw new AppError('Failed to create product', 500);
  }
};

/**
 * GET /api/seller/products
 * List all products for the authenticated seller.
 * Supports optional status filter (active / draft) and text search.
 */
export const listProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const seller = await prisma.seller.findUnique({
      where: { userId: userPayload.userId },
      select: { id: true },
    });

    if (!seller) {
      throw new AppError('Seller account not found. Please register as a seller.', 404);
    }

    // Parse & validate query params
    const query = req.query as Record<string, string>;
    const parsed = listProductsSchema.safeParse(query);
    if (!parsed.success) {
      throw new AppError('Invalid query parameters', 400);
    }
    const { status, search, page, limit } = parsed.data;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { sellerId: seller.id };
    if (status) where.isActive = status === 'active';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          category: true,
          subcategory: true,
          stock: true,
          image: true,
          serviceType: true,
          details: true,
          images: true,
          isActive: true,
          condition: true,
          tags: true,
          comparePrice: true,
          costPrice: true,
          createdAt: true,
          updatedAt: true,
          seller: { select: { id: true, deliveryFee: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);
    const normalized = products.map((p: any) => ({
      ...p,
      image:       absUrl(p.image),
      serviceType: p.serviceType,
      details:     p.details,
      deliveryFee: p.seller?.deliveryFee !== null && p.seller?.deliveryFee !== undefined ? parseFloat(p.seller.deliveryFee.toString()) : null,
    }));
    void res.json({ success: true, data: { products: normalized, total } });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('listProducts error:', error);
    throw new AppError('Failed to fetch products', 500);
  }
};

/**
 * DELETE /api/seller/products/:id
 * Permanently delete a product belonging to the authenticated seller.
 */
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, sellerId: true },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Verify ownership
    const seller = await prisma.seller.findUnique({
      where: { userId: userPayload.userId },
      select: { id: true },
    });

    if (!seller || product.sellerId !== seller.id) {
      throw new AppError('You do not have permission to delete this product', 403);
    }

    await prisma.product.delete({ where: { id } });

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('deleteProduct error:', error);
    throw new AppError('Failed to delete product', 500);
  }
};

/**
 * GET /api/seller/products/:id
 * Fetch a single product with its stats, recent orders, and reviews.
 * @query   includeStats=true|false   includeOrders=true|false   includeReviews=true|false
 * @access  Private (owner only)
 */
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const { id } = req.params;
    const { includeStats, includeOrders, includeReviews } = req.query as Record<string, string>;

    const product = await prisma.product.findUnique({
      where: { id },
        select: {
        id: true,
        sellerId: true,
        name: true,
        description: true,
        price: true,
        category: true,
        subcategory: true,
        stock: true,
        image: true,
        serviceType: true,
        details: true,
        images: true,
        isActive: true,
        condition: true,
        tags: true,
        comparePrice: true,
        costPrice: true,
        createdAt: true,
        updatedAt: true,
        rating: true,
        reviewCount: true,
      },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Verify ownership
    const seller = await prisma.seller.findUnique({
      where: { userId: userPayload.userId },
      select: { id: true },
    });

    if (!seller || product.sellerId !== seller.id) {
      throw new AppError('You do not have permission to view this product', 403);
    }

    const result: any = { ...product, image: absUrl(product.image), serviceType: product.serviceType, details: product.details };
    if (Array.isArray(product.images)) result.images = product.images.map(absUrl);

    // Revenue-carrying order statuses
    const REVENUE_STATUSES = ['processing', 'shipped', 'delivered'] as readonly ['processing', 'shipped', 'delivered'];

    // Units sold
    const unitsSoldAgg = await prisma.orderItem.aggregate({
      where: {
        productId: id,
        order: { status: { in: REVENUE_STATUSES } as any },
      },
      _sum: { quantity: true },
    });

    const unitsSold = (unitsSoldAgg._sum as any)?.quantity || 0;

    // Revenue (non-void revenue orders)
    const revenueAgg = await prisma.orderItem.aggregate({
      where: {
        productId: id,
        order: { status: { in: REVENUE_STATUSES } as any },
      },
      _sum: { price: true },
    });
    const revenue = parseFloat(String((revenueAgg._sum as any)?.price || 0));

    // Conversion rate (units sold / stock level)
    const conversionRate = product.stock > 0 ? (unitsSold / product.stock) * 100 : 0;

    // Saves / wishlist count
    const wishlistCount = await prisma.wishlist.count({
      where: { productId: id },
    });

    // Unique buyer count
    const buyersItems = await prisma.orderItem.findMany({
      where: {
        productId: id,
        order: { status: { in: REVENUE_STATUSES } as any },
      },
      select: { order: { select: { buyerId: true } } },
    });
    const uniqueBuyers = new Set(buyersItems.map((b: any) => b.order.buyerId)).size;

    result.stats = {
      views: 0,
      unitsSold,
      revenue: Number(revenue.toFixed(2)),
      conversionRate: Number(conversionRate.toFixed(1)),
      wishlistCount,
      rating: product.rating || 0,
      reviewerCount: product.reviewCount || 0,
      uniqueBuyers,
    };

    // Recent orders for this product
    if (includeOrders !== 'false') {
      const recentOrders = await prisma.orderItem.findMany({
        where: { productId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          quantity: true,
          price: true,
          createdAt: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              totalAmount: true,
              buyer: { select: { firstName: true, lastName: true, avatar: true } },
            },
          },
        },
      });

      result.orders = recentOrders.map((oi: any) => ({
        id: oi.order.id,
        orderNumber: oi.order.orderNumber,
        status: oi.order.status,
        quantity: oi.quantity,
        itemPrice: parseFloat(oi.price.toString()),
        orderTotal: parseFloat(oi.order.totalAmount.toString()),
        createdAt: oi.createdAt,
        buyer: {
          name: `${oi.order.buyer.firstName} ${oi.order.buyer.lastName}`.trim(),
          avatar: absUrl(oi.order.buyer.avatar),
        },
      }));
    }

    // Reviews
    if (includeReviews !== 'false') {
      const reviews = await prisma.review.findMany({
        where: { productId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true, avatar: true } },
        },
      });

      result.reviews = reviews.map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        user: {
          name: `${r.user.firstName} ${r.user.lastName}`.trim(),
          avatar: absUrl(r.user.avatar),
        },
      }));

      result.reviewSummaryText = reviews.length > 0
        ? `${reviews.length} review${reviews.length > 1 ? 's' : ''}`
        : 'No reviews yet';
    }

    void res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('getProductById error:', error);
    throw new AppError('Failed to fetch product details', 500);
  }
};

/**
 * PUT /api/seller/products/:id
 * Update an existing product.
 */
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) throw new AppError('Authentication required', 401);

    const { id } = req.params;
    const fields  = req.body;
    const parsed  = createProductSchema.safeParse(fields);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.issues });
      return;
    }
    const input = parsed.data;

    const existing = await prisma.product.findUnique({ where: { id }, select: { id: true, sellerId: true } });
    if (!existing) throw new AppError('Product not found', 404);

    const seller = await prisma.seller.findUnique({ where: { userId: userPayload.userId }, select: { id: true } });
    if (!seller || existing.sellerId !== seller.id) throw new AppError('Forbidden', 403);

    const files = (req as any).files as File[] | undefined;
    let imageUrls: string[] = [];
    if (files && files.length > 0) imageUrls = files.map(f => `/uploads/${(f as any).filename}`);

    const updateData: any = {
      name:        input.name,
      description: input.description,
      price:       input.price,
      category:    input.category,
      subcategory: input.subcategory || null,
      stock:       input.stock,
      isActive:    input.isActive ?? false,
      condition:   input.condition || null,
      tags:        input.tags || [],
      comparePrice: input.comparePrice ?? null,
      costPrice:    input.costPrice ?? null,
    };

    if (imageUrls.length > 0) {
      updateData.image  = imageUrls[0];
      updateData.images = imageUrls.slice(1);
    }

    // Persist fulfillment + location inside details
    const existingProduct = await prisma.product.findUnique({ where: { id }, select: { details: true } });
    const existingDetails = (existingProduct?.details as Record<string, any>) || {};

    const detailsObj: Record<string, any> = typeof input.details === 'object' && input.details !== null
      ? { ...(input.details as object) }
      : {};
    if (input.fulfillment) detailsObj._fulfillment = input.fulfillment;
    else if (existingDetails._fulfillment) detailsObj._fulfillment = existingDetails._fulfillment;
    if (input.location) detailsObj._location = input.location;
    else if (existingDetails._location) detailsObj._location = existingDetails._location;
    updateData.details = Object.keys(detailsObj).length ? detailsObj : existingDetails;

    const product = await prisma.product.update({
      where: { id },
      data:  updateData,
      select: {
        id: true, name: true, description: true, price: true,
        category: true, subcategory: true, stock: true, image: true,
        details: true, images: true, isActive: true, condition: true,
        tags: true, comparePrice: true, costPrice: true,
        createdAt: true, updatedAt: true,
      },
    });

    const result: any = { ...product, image: absUrl(product.image), details: product.details };
    if (Array.isArray(product.images)) result.images = product.images.map(absUrl);
    void res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('updateProduct error:', error);
    throw new AppError('Failed to update product', 500);
  }
};

/**
 * PATCH /api/seller/products/:id/toggle
 * Toggle a product's active / draft status.
 */
export const toggleProductStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const { id } = req.params;
    const { isActive } = (req as any).body;

    if (typeof isActive !== 'boolean') {
      throw new AppError('Invalid status payload', 400);
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, sellerId: true },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const seller = await prisma.seller.findUnique({
      where: { userId: userPayload.userId },
      select: { id: true },
    });

    if (!seller || product.sellerId !== seller.id) {
      throw new AppError('You do not have permission to modify this product', 403);
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { isActive },
      select: {
        id: true, name: true, isActive: true,
        price: true, image: true, category: true, stock: true, description: true,
        updatedAt: true,
      },
    });

    void res.json({
      success: true,
      data: { ...updated, image: absUrl(updated.image) },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('toggleProductStatus error:', error);
    throw new AppError('Failed to update product status', 500);
  }
};
