import { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { authenticate } from '../controllers/auth.controller';
import { NotificationService } from '../services/notification.service';
import { sendNewReviewEmail, sendContactSellerEmail, sendSupportContactEmail } from '../services/email.service';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

function absUrl(path: string | null | undefined): string | null {
  const p = path || '';
  if (!p || p.endsWith('/')) return null;
  if (p.startsWith('/uploads')) {
    try { return new URL(p, BACKEND_URL).href; } catch { return `${BACKEND_URL}${p}`; }
  }
  if (/^https?:/.test(p) || p.startsWith('data:') || p.startsWith('blob:')) return p;
  return `${BACKEND_URL}${p}`;
}

/**
 * GET /api/public/products
 * Paginated, filterable public product listing.
 * @query category, minPrice, maxPrice, sellerType, minRating, search, sort (newest|price-asc|price-desc|popular|rating), page, limit
 * @access Public
 */
export const getPublicProducts = async (req: Request, res: Response): Promise<void> => {
  const category    = (req.query.category    as string) || 'all';
  const subcategory = (req.query.subcategory as string) || '';
  const search      = (req.query.search      as string) || '';
  const sort        = (req.query.sort        as string) || 'newest';
  const sellerType  = (req.query.sellerType  as string) || 'all';
  const condition   = (req.query.condition   as string) || '';
  const inStock     = req.query.inStock === 'true';
  const minPrice    = parseFloat(req.query.minPrice as string) || 0;
  const maxPrice    = parseFloat(req.query.maxPrice as string) || 0;
  const minRating   = parseFloat(req.query.minRating as string) || 0;
  const page        = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit       = Math.min(48, parseInt(req.query.limit as string) || 24);
  const skip        = (page - 1) * limit;

  const SERVICE_CATS: string[] = [];
  const where: any = { isActive: true };
  if (category !== 'all') {
    where.category = category;
  }
  if (subcategory)        where.subcategory = { contains: subcategory, mode: 'insensitive' };
  if (condition)          where.condition = condition;
  if (inStock)            where.stock = { gt: 0 };
  if (minPrice > 0)       where.price = { ...(where.price || {}), gte: minPrice };
  if (maxPrice > 0)       where.price = { ...(where.price || {}), lte: maxPrice };
  if (minRating > 0)      where.rating = { gte: minRating };
  if (sellerType === 'campus')      where.seller = { businessType: 'campus_seller' };
  if (sellerType === 'independent') where.seller = { businessType: { notIn: ['campus', 'campus_seller'] } };
  if (search) {
    where.OR = [
      { name:        { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags:        { has: search } },
    ];
  }

  const orderBy: any =
    sort === 'price-asc'  ? { price: 'asc' } :
    sort === 'price-desc' ? { price: 'desc' } :
    sort === 'popular'    ? { reviewCount: 'desc' } :
    sort === 'rating'     ? { rating: 'desc' } :
    { createdAt: 'desc' };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        comparePrice: true,
        image: true,
        category: true,
        rating: true,
        reviewCount: true,
        serviceType: true,
        seller: {
          select: {
            id: true, storeName: true, deliveryFee: true,
          },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

    const data = products.map(p => ({
      id: p.id, name: p.name, description: p.description,
      price: parseFloat(p.price.toString()),
      comparePrice: p.comparePrice ? parseFloat(p.comparePrice.toString()) : null,
      image: absUrl(p.image), category: p.category,
      rating: p.rating, reviewCount: p.reviewCount,
      serviceType: p.serviceType,
      deliveryFee: p.seller.deliveryFee !== null && p.seller.deliveryFee !== undefined ? parseFloat(p.seller.deliveryFee.toString()) : null,
      storeName: p.seller.storeName, sellerId: p.seller.id,
    }));

  res.json({ success: true, data, total, page, limit, totalPages: Math.ceil(total / limit) });
};

/**
 * GET /api/public/products/:id
 * Full product detail for the product details page.
 * Returns: product fields, all images, seller profile + stats, reviews + breakdown, related products.
 * @access Public
 */
export const getPublicProductById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true, name: true, description: true, price: true, comparePrice: true,
      image: true, images: true, category: true, subcategory: true, condition: true,
      tags: true, stock: true, rating: true, reviewCount: true,
      details: true, serviceType: true,
      seller: {
        select: {
          id: true, storeName: true, storeDescription: true, storeAvatar: true,
          storeBanner: true, storeColor: true, category: true, city: true, country: true,
          isActive: true, createdAt: true, userId: true, deliveryFee: true,
          user: { select: { bio: true, location: true } },
          _count: { select: { products: { where: { isActive: true } } } },
        },
      },
    },
  });

  if (!product) throw new AppError('Product not found', 404);

  // ── Units sold ────────────────────────────────────────────────────────────
  const REVENUE_STATUSES = ['processing', 'shipped', 'delivered'] as const;
  const soldAgg = await prisma.orderItem.aggregate({
    where: { productId: id, order: { status: { in: REVENUE_STATUSES as any } } },
    _sum: { quantity: true },
  });
  const unitsSold = (soldAgg._sum as any)?.quantity || 0;

  // ── Reviews (latest 10) + breakdown ──────────────────────────────────────
  const [reviews, ratingGroups] = await Promise.all([
    prisma.review.findMany({
      where: { productId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, rating: true, comment: true, createdAt: true,
        user: { select: { firstName: true, lastName: true, avatar: true } },
      },
    }),
    prisma.review.groupBy({
      by: ['rating'],
      where: { productId: id },
      _count: { rating: true },
    }),
  ]);

  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratingGroups.forEach(g => { breakdown[g.rating] = g._count.rating; });
  const totalReviews = product.reviewCount || 0;
  const ratingPct: Record<number, number> = {};
  for (let i = 1; i <= 5; i++) {
    ratingPct[i] = totalReviews > 0 ? Math.round((breakdown[i] / totalReviews) * 100) : 0;
  }

  // ── Seller product count + avg rating ────────────────────────────────────
  const sellerProducts = await prisma.product.findMany({
    where: { sellerId: product.seller.id, isActive: true },
    select: { rating: true, reviewCount: true },
  });
  const totalSellerReviews = sellerProducts.reduce((a, p) => a + p.reviewCount, 0);
  const sellerRatingSum    = sellerProducts.reduce((a, p) => a + p.rating * p.reviewCount, 0);
  const sellerAvgRating    = totalSellerReviews > 0 ? parseFloat((sellerRatingSum / totalSellerReviews).toFixed(1)) : 0;

  // ── Related products (same category, excluding this one) ─────────────────
  const related = await prisma.product.findMany({
    where: { category: product.category, isActive: true, id: { not: id } },
    orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
    take: 4,
    select: {
      id: true,
      name: true,
      price: true,
      comparePrice: true,
      image: true,
      category: true,
      rating: true,
      reviewCount: true,
      serviceType: true,
      seller: {
        select: {
          id: true, storeName: true, storeDescription: true, storeAvatar: true,
          storeBanner: true, storeColor: true, category: true, city: true, country: true,
          isActive: true, createdAt: true, userId: true, deliveryFee: true,
          user: { select: { bio: true, location: true } },
          _count: { select: { products: { where: { isActive: true } } } },
        },
      },
    },
  });

  const allImages = [
    absUrl(product.image),
    ...product.images.map(absUrl),
  ].filter(Boolean);

  res.json({
    success: true,
    data: {
      id:           product.id,
      name:         product.name,
      description:  product.description,
      price:        parseFloat(product.price.toString()),
      comparePrice: product.comparePrice ? parseFloat(product.comparePrice.toString()) : null,
      images:       allImages,
      category:     product.category,
      subcategory:  product.subcategory,
      condition:    product.condition,
      tags:         product.tags,
      stock:        product.stock,
      rating:       product.rating,
      reviewCount:  totalReviews,
      unitsSold,
      deliveryFee:  product.seller.deliveryFee ? parseFloat(product.seller.deliveryFee.toString()) : null,
      details:      product.details,
      serviceType:  product.serviceType,
      seller: {
        id:               product.seller.id,
        userId:           product.seller.userId,
        storeName:        product.seller.storeName,
        storeDescription: product.seller.storeDescription,
        storeAvatar:      absUrl(product.seller.storeAvatar),
        storeBanner:      absUrl(product.seller.storeBanner),
        storeColor:       product.seller.storeColor,
        category:         product.seller.category,
        city:             product.seller.city,
        country:          product.seller.country,
        verified:         product.seller.isActive,
        joinedDate:       product.seller.createdAt,
        bio:              product.seller.user.bio,
        location:         product.seller.user.location,
        productCount:     product.seller._count.products,
        avgRating:        sellerAvgRating,
        totalReviews:     totalSellerReviews,
      },
      reviews: reviews.map(r => ({
        id:        r.id,
        rating:    r.rating,
        comment:   r.comment || '',
        createdAt: r.createdAt,
        user: {
          name:     `${r.user.firstName} ${r.user.lastName}`.trim(),
          initials: `${r.user.firstName[0]}${r.user.lastName?.[0] || ''}`.toUpperCase(),
          avatar:   absUrl(r.user.avatar),
        },
      })),
      ratingBreakdown: ratingPct,
      ratingCounts:    breakdown,
      related: related.map(p => ({
        id:             p.id,
        name:           p.name,
        price:          parseFloat(p.price.toString()),
        comparePrice:   p.comparePrice ? parseFloat(p.comparePrice.toString()) : null,
        image:          absUrl(p.image),
        rating:         p.rating,
        reviewCount:    p.reviewCount,
        deliveryFee:    p.seller.deliveryFee !== null && p.seller.deliveryFee !== undefined ? parseFloat(p.seller.deliveryFee.toString()) : null,
        storeName:      p.seller.storeName,
        category:       p.category,
        serviceType:    p.serviceType,
      })),
    },
  });
};

/**
 * GET /api/public/products/:id/reviews
 * Paginated reviews for load-more.
 */
export const getProductReviews = async (req: Request, res: Response): Promise<void> => {
  const { id }  = req.params;
  const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit   = Math.min(20, parseInt(req.query.limit as string) || 10);
  const skip    = (page - 1) * limit;

  const product = await prisma.product.findUnique({ where: { id }, select: { reviewCount: true } });
  if (!product) throw new AppError('Product not found', 404);

  const reviews = await prisma.review.findMany({
    where: { productId: id },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    select: {
      id: true, rating: true, comment: true, createdAt: true,
      user: { select: { firstName: true, lastName: true, avatar: true } },
    },
  });

  res.json({
    success: true,
    data: {
      reviews: reviews.map(r => ({
        id:        r.id,
        rating:    r.rating,
        comment:   r.comment || '',
        createdAt: r.createdAt,
        user: {
          name:     `${r.user.firstName} ${r.user.lastName}`.trim(),
          initials: `${r.user.firstName[0]}${r.user.lastName?.[0] || ''}`.toUpperCase(),
          avatar:   absUrl(r.user.avatar),
        },
      })),
      total: product.reviewCount,
      page,
      limit,
    },
  });
};

/**
 * GET /api/public/stats
 * Platform-wide counts for the home page hero.
 * @access Public
 */
export const getPublicStats = async (_req: Request, res: Response): Promise<void> => {
  const [products, sellers, buyers] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.seller.count(),
    prisma.buyer.count(),
  ]);

  function fmt(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K+`;
    return String(n);
  }

  res.json({ success: true, data: { products: fmt(products), sellers: fmt(sellers), buyers: fmt(buyers) } });
};

/**
 * GET /api/public/check-buyer-email
 * Returns whether an email is already registered as a buyer.
 * @access Public
 */
export const checkBuyerEmail = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.query;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ success: false, error: 'Email is required' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });
  if (!user) {
    res.json({ success: true, data: { isBuyer: false } });
    return;
  }
  const buyer = await prisma.buyer.findUnique({ where: { userId: user.id }, select: { id: true } });
  res.json({ success: true, data: { isBuyer: !!buyer } });
};

/**
 * GET /api/public/products/trending
 * Top 8 active products ordered by rating then reviewCount.
 * @access Public
 */
export const getTrendingProducts = async (_req: Request, res: Response): Promise<void> => {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
    take: 8,
    select: {
      id: true,
      name: true,
      price: true,
      comparePrice: true,
      image: true,
      category: true,
      subcategory: true,
      condition: true,
      tags: true,
      description: true,
      rating: true,
      reviewCount: true,
      details: true,
      seller: { select: { id: true, storeName: true, deliveryFee: true } },
    },
  });

  const data = products.map(p => ({
    id: p.id,
    name: p.name,
    price: parseFloat(p.price.toString()),
    comparePrice: p.comparePrice ? parseFloat(p.comparePrice.toString()) : null,
    image: absUrl(p.image),
    category: p.category,
    subcategory: p.subcategory,
    condition: p.condition,
    tags: p.tags,
    description: p.description,
    rating: p.rating,
    reviewCount: p.reviewCount,
    details: p.details,
    deliveryFee: p.seller.deliveryFee !== null && p.seller.deliveryFee !== undefined ? parseFloat(p.seller.deliveryFee.toString()) : null,
    storeName: p.seller.storeName,
    sellerId: p.seller.id,
  }));

  res.json({ success: true, data });
};

/**
 * GET /api/public/stores
 * Paginated, filterable store listing for the stores page.
 * @query category, search, sort (featured|rating|products|newest|az), page, limit
 * @access Public
 */
export const getPublicStores = async (req: Request, res: Response): Promise<void> => {
  const category = (req.query.category as string) || 'all';
  const search   = (req.query.search   as string) || '';
  const sort     = (req.query.sort     as string) || 'featured';
  const page     = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit    = Math.min(50, parseInt(req.query.limit as string) || 18);
  const skip     = (page - 1) * limit;

  const where: any = {};
  if (category !== 'all') where.category = category;
  if (search) {
    where.OR = [
      { storeName:        { contains: search, mode: 'insensitive' } },
      { storeDescription: { contains: search, mode: 'insensitive' } },
      { category:         { contains: search, mode: 'insensitive' } },
    ];
  }

  const orderBy: any =
    sort === 'newest'   ? { createdAt: 'desc' } :
    sort === 'az'       ? { storeName: 'asc'  } :
    sort === 'products' ? { products: { _count: 'desc' } } :
    { createdAt: 'asc' }; // featured / rating — post-sorted below

  const [sellers, total] = await Promise.all([
    prisma.seller.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        storeName: true,
        storeDescription: true,
        storeAvatar: true,
        storeBanner: true,
        storeColor: true,
        category: true,
        createdAt: true,
        _count: { select: { products: { where: { isActive: true } } } },
        products: {
          where: { isActive: true },
          select: { rating: true, reviewCount: true },
        },
      },
    }),
    prisma.seller.count({ where }),
  ]);

  let data = sellers.map(s => {
    const reviews      = s.products.reduce((a, p) => a + p.reviewCount, 0);
    const ratingSum    = s.products.reduce((a, p) => a + p.rating * p.reviewCount, 0);
    const avgRating    = reviews > 0 ? parseFloat((ratingSum / reviews).toFixed(1)) : 0;
    const productCount = s._count.products;

    return {
      id:               s.id,
      storeName:        s.storeName,
      storeDescription: s.storeDescription || '',
      storeAvatar:      absUrl(s.storeAvatar),
      storeBanner:      absUrl(s.storeBanner),
      storeColor:       s.storeColor || null,
      category:         s.category || 'other',
      createdAt:        s.createdAt,
      productCount,
      avgRating,
      totalReviews: reviews,
    };
  });

  if (sort === 'rating')   data.sort((a, b) => b.avgRating    - a.avgRating);
  if (sort === 'featured') data.sort((a, b) => b.totalReviews - a.totalReviews);

  res.json({ success: true, data, total, page, limit, hasMore: skip + limit < total });
};

/**
 * GET /api/public/seller/:sellerId
 * Public profile page data — no auth required.
 * Returns profile, stats, active products, and reviews in one response.
 */
export const getPublicSellerProfile = async (req: Request, res: Response): Promise<void> => {
  const { sellerId } = req.params;

  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    include: { user: true },
  });

  if (!seller) throw new AppError('Seller not found', 404);

  const user = seller.user;
  const fullName = `${user.firstName} ${user.lastName}`.trim();

  // ── Active products ──────────────────────────────────────────────────────
  const products = await prisma.product.findMany({
    where: { sellerId, isActive: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      price: true,
      comparePrice: true,
      image: true,
      images: true,
      category: true,
      rating: true,
      reviewCount: true,
      stock: true,
      tags: true,
    },
  });

  const normalizedProducts = products.map(p => ({
    ...p,
    price: parseFloat(p.price.toString()),
    comparePrice: p.comparePrice ? parseFloat(p.comparePrice.toString()) : null,
    image: absUrl(p.image),
    images: p.images.map(absUrl),
  }));

  // ── Reviews (paginated, latest first) ───────────────────────────────────
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(20, parseInt(req.query.limit as string) || 10);
  const skip = (page - 1) * limit;

  const [reviews, totalReviews] = await Promise.all([
    prisma.review.findMany({
      where: { product: { sellerId } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, avatar: true } },
        product: { select: { id: true, name: true } },
      },
    }),
    prisma.review.count({ where: { product: { sellerId } } }),
  ]);

  const normalizedReviews = reviews.map(r => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment || '',
    createdAt: r.createdAt,
    productId: r.product.id,
    productName: r.product.name,
    buyer: {
      name: `${r.user.firstName} ${r.user.lastName}`.trim(),
      initials: `${r.user.firstName[0]}${r.user.lastName?.[0] || ''}`.toUpperCase(),
      avatar: absUrl(r.user.avatar),
    },
  }));

  // ── Rating breakdown (1★–5★) ─────────────────────────────────────────────
  const ratingGroups = await prisma.review.groupBy({
    by: ['rating'],
    where: { product: { sellerId } },
    _count: { rating: true },
  });

  const ratingBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratingGroups.forEach(g => { ratingBreakdown[g.rating] = g._count.rating; });

  const ratingPct: Record<number, number> = {};
  for (let i = 1; i <= 5; i++) {
    ratingPct[i] = totalReviews > 0 ? Math.round((ratingBreakdown[i] / totalReviews) * 100) : 0;
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  const REVENUE_STATUSES = ['processing', 'shipped', 'delivered'] as const;

  const [totalSalesAgg, avgRatingAgg, followerCount] = await Promise.all([
    prisma.orderItem.aggregate({
      where: { product: { sellerId }, order: { status: { in: REVENUE_STATUSES as any } } },
      _sum: { quantity: true },
    }),
    prisma.review.aggregate({
      where: { product: { sellerId } },
      _avg: { rating: true },
    }),
    prisma.follow.count({ where: { sellerId } }),
  ]);

  const totalSales = (totalSalesAgg._sum as any)?.quantity || 0;
  const avgRating = avgRatingAgg._avg?.rating
    ? parseFloat(avgRatingAgg._avg.rating.toFixed(1))
    : null;

  // ── Category counts for filter tabs ─────────────────────────────────────
  const categoryCounts = await prisma.product.groupBy({
    by: ['category'],
    where: { sellerId, isActive: true },
    _count: { category: true },
  });

  const categoryMap: Record<string, number> = {};
  categoryCounts.forEach(c => { categoryMap[c.category] = c._count.category; });

  // ── Response ─────────────────────────────────────────────────────────────
  res.json({
    success: true,
    data: {
      profile: {
        sellerId: seller.id,
        name: fullName,
        bio: user.bio || null,
        avatar: absUrl(user.avatar),
        location: user.location || null,
        city: seller.city || null,
        country: seller.country || null,
        joinedDate: seller.createdAt,
        storeName: seller.storeName,
        storeDescription: seller.storeDescription || null,
        storeBanner: absUrl(seller.storeBanner),
        storeAvatar: absUrl(seller.storeAvatar),
        storeColor: seller.storeColor || null,
        category: seller.category || null,
        instagram: user.instagram || null,
        twitter: user.twitter || null,
        tiktok: user.tiktok || null,
        website: user.website || null,
        whatsapp: user.whatsapp || null,
        verified: seller.isActive,
        deliveryFee: seller.deliveryFee !== null && seller.deliveryFee !== undefined ? parseFloat(seller.deliveryFee.toString()) : null,
      },
      stats: {
        totalSales,
        avgRating,
        totalReviews,
        productCount: products.length,
        followerCount,
      },
      products: normalizedProducts,
      categorycounts: categoryMap,
      reviews: normalizedReviews,
      ratingBreakdown: ratingPct,
      pagination: {
        page,
        limit,
        total: totalReviews,
        hasMore: skip + limit < totalReviews,
      },
    },
  });
};

/**
 * POST /api/public/reviews
 * Submit a review for a product.
 * - Auth required (any logged-in user)
 * - Seller of that product cannot review their own product
 * - One review per user per product
 */
export const submitReview = async (req: Request, res: Response): Promise<void> => {
  const userPayload = authenticate(req);
  if (!userPayload) throw new AppError('You must be logged in to leave a review', 401);

  const { productId, rating, comment } = req.body;

  if (!productId) throw new AppError('Product ID is required', 400);
  if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
    throw new AppError('Rating must be a number between 1 and 5', 400);
  }

  // Fetch product + its seller's userId
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      sellerId: true,
      seller: {
        select: {
          userId: true,
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!product) throw new AppError('Product not found', 404);

  // Block seller from reviewing their own product
  if (product.seller.userId === userPayload.userId) {
    throw new AppError('You cannot review your own product', 403);
  }

  // Check for duplicate review
  const existing = await prisma.review.findUnique({
    where: { productId_userId: { productId, userId: userPayload.userId } },
  });
  if (existing) throw new AppError('You have already reviewed this product', 409);

  // Create review + update product rating in a transaction
  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        productId,
        userId: userPayload.userId,
        rating,
        comment: comment?.trim() || null,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, avatar: true } },
        product: { select: { id: true, name: true } },
      },
    });

    // Recalculate product avg rating and review count
    const agg = await tx.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await tx.product.update({
      where: { id: productId },
      data: {
        rating: parseFloat((agg._avg.rating || 0).toFixed(2)),
        reviewCount: agg._count.rating,
      },
    });

    return created;
  });

  // ── Fire notifications (non-blocking) ──────────────────────────────────
  const sellerUserId  = product.seller.userId;
  const sellerEmail   = product.seller.user.email;
  const sellerName    = `${product.seller.user.firstName} ${product.seller.user.lastName}`.trim();
  const reviewerName  = `${review.user.firstName} ${review.user.lastName}`.trim();

  // 1. In-app notification (respects reviewNotifications preference)
  NotificationService.create({
    userId:    sellerUserId,
    type:      'new_review',
    title:     'New Review on Your Product',
    message:   `${reviewerName} left a ${rating}★ review on "${product.name}"`,
    productId: review.product.id,
    actionUrl: `/pages/public/shop/product-details.html?id=${review.product.id}`,
    icon:      'star',
    priority:  'normal',
  }).catch(err => console.error('[review] Failed to create in-app notification:', err));

  // 2. Email notification (respects emailNotifications + reviewNotifications preferences)
  NotificationService.shouldSendReviewNotification(sellerUserId).then(({ email }) => {
    if (!email) return;
    sendNewReviewEmail(sellerEmail, sellerName, reviewerName, product.name, rating, review.comment, review.product.id)
      .catch(err => console.error('[review] Failed to send review email:', err));
  }).catch(() => {});

  res.status(201).json({
    success: true,
    data: {
      id: review.id,
      rating: review.rating,
      comment: review.comment || '',
      createdAt: review.createdAt,
      productId: review.product.id,
      productName: review.product.name,
      buyer: {
        name: `${review.user.firstName} ${review.user.lastName}`.trim(),
        initials: `${review.user.firstName[0]}${review.user.lastName?.[0] || ''}`.toUpperCase(),
        avatar: absUrl(review.user.avatar),
      },
    },
  });
};

/**
 * POST /api/public/seller/:sellerId/contact
 * Send a contact message to a seller via email.
 * @access Public (logged-in buyers preferred, but not strictly required)
 */
export const contactSeller = async (req: Request, res: Response): Promise<void> => {
  const { sellerId } = req.params;
  const { message } = req.body as { message?: string };

  if (!message || !message.trim()) {
    throw new AppError('Please write a message before sending.', 400);
  }

  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: {
      id: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!seller) throw new AppError('Seller not found.', 404);

  const sellerName = `${seller.user.firstName} ${seller.user.lastName}`.trim();
  const sellerEmail = seller.user.email;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const sellerStoreUrl = `${frontendUrl}/pages/seller/public/profile/profile.html?sellerId=${sellerId}`;

  let buyerName = 'A buyer';
  let buyerEmail = 'no-reply@unimartx.com';

  try {
    const authPayload = authenticate(req);
    if (authPayload) {
      const buyerUser = await prisma.user.findUnique({
        where: { id: authPayload.userId },
        select: { firstName: true, lastName: true, email: true },
      });
      if (buyerUser) {
        buyerName = `${buyerUser.firstName} ${buyerUser.lastName}`.trim();
        buyerEmail = buyerUser.email;
      }
    }
  } catch {
    // Not authenticated — that's fine, send as anonymous buyer
  }

  await sendContactSellerEmail(
    sellerEmail,
    sellerName,
    buyerName,
    buyerEmail,
    message.trim(),
    sellerStoreUrl
  );

  res.json({ success: true, message: 'Message sent to seller.' });
};

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER || 'dexecommerce2@gmail.com';

export const publicContact = async (req: Request, res: Response): Promise<void> => {
  const { name, email, subject, message, phone } = req.body as {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
    phone?: string;
  };

  if (!name || !name.trim()) throw new AppError('Name is required.', 400);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('A valid email is required.', 400);
  if (!subject || !subject.trim()) throw new AppError('Subject is required.', 400);
  if (!message || !message.trim()) throw new AppError('Message is required.', 400);

  try {
    await sendSupportContactEmail(
      SUPPORT_EMAIL,
      name.trim(),
      email.trim(),
      (phone || '').trim(),
      subject.trim(),
      message.trim()
    );
    res.json({ success: true, message: 'Message received. We\'ll get back to you within 24 hours.' });
  } catch {
    throw new AppError('Failed to send message. Please try again later.', 500);
  }
};
