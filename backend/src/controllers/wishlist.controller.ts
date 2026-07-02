import { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { authenticate } from './auth.controller';
import { NotificationService } from '../services/notification.service';
import { getVerificationBaseUrl } from '../services/email.service';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
function absUrl(p: string | null | undefined): string | null {
  if (!p) return null;
  if (/^https?:/.test(p) || p.startsWith('data:') || p.startsWith('blob:')) return p;
  return `${BACKEND_URL}${p}`;
}

/**
 * GET /api/wishlist
 * Returns all wishlist items for the authenticated user.
 */
export const getWishlist = async (req: Request, res: Response): Promise<void> => {
  const user = authenticate(req);
  if (!user) throw new AppError('Authentication required', 401);

  const items = await prisma.wishlist.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      productId: true,
      createdAt: true,
      product: {
    select: {
      id: true,
      name: true,
      price: true,
      comparePrice: true,
      image: true,
      rating: true,
      reviewCount: true,
      stock: true,
      isActive: true,
      seller: { select: { id: true, storeName: true, deliveryFee: true } },
    },
      },
    },
  });

  const data = items.map((i: any) => ({
    id: i.id,
    productId: i.productId,
    createdAt: i.createdAt,
    product: {
      ...i.product,
      image: absUrl(i.product.image),
      price: parseFloat(i.product.price),
      comparePrice: i.product.comparePrice ? parseFloat(i.product.comparePrice) : null,
      deliveryFee: i.product.seller.deliveryFee != null ? parseFloat(i.product.seller.deliveryFee) : null,
    },
  }));

  res.json({ success: true, data });
};

/**
 * POST /api/wishlist/toggle
 * Body: { productId }
 * Adds to wishlist if not present, removes if already saved.
 * Returns { saved: boolean, wishlistId?: string }
 */
export const toggleWishlist = async (req: Request, res: Response): Promise<void> => {
  const user = authenticate(req);
  if (!user) throw new AppError('Authentication required', 401);

  const { productId } = req.body;
  if (!productId) throw new AppError('productId is required', 400);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      seller: {
        select: {
          id: true,
          storeName: true,
          userId: true,
          user: { select: { email: true, firstName: true } },
        },
      },
    },
  });
  if (!product) throw new AppError('Product not found', 404);

  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId: user.userId, productId } },
  });

  if (existing) {
    await prisma.wishlist.delete({ where: { id: existing.id } });
    res.json({ success: true, saved: false });
  } else {
    const entry = await prisma.wishlist.create({ data: { userId: user.userId, productId } });

    // Don't notify seller if they wishlisted their own product
    if (product.seller.userId !== user.userId) {
      const wishlistCount = await prisma.wishlist.count({ where: { productId } });
      const frontendBase  = getVerificationBaseUrl().replace(/\/$/, '');
      const productUrl    = `${frontendBase}/pages/public/shop/product-details.html?id=${productId}`;
      const sellerName    = product.seller.user.firstName || product.seller.storeName;

      // In-app notification (respects wishlistAlerts preference)
      NotificationService.create({
        userId:    product.seller.userId,
        type:      'product_wishlisted',
        title:     '\u2764\ufe0f Product Saved',
        message:   `Someone added "${product.name}" to their wishlist. It now has ${wishlistCount} save${wishlistCount !== 1 ? 's' : ''}.`,
        productId,
        actionUrl: productUrl,
        icon:      'heart',
        priority:  'normal',
        metadata:  { wishlistCount },
      }).catch(() => {/* silent */});
    }

    res.json({ success: true, saved: true, wishlistId: entry.id });
  }
};

/**
 * GET /api/wishlist/ids
 * Returns just the product IDs in the user's wishlist (for fast UI hydration).
 */
export const getWishlistIds = async (req: Request, res: Response): Promise<void> => {
  const user = authenticate(req);
  if (!user) throw new AppError('Authentication required', 401);

  const items = await prisma.wishlist.findMany({
    where: { userId: user.userId },
    select: { productId: true },
  });

  res.json({ success: true, data: items.map((i: any) => i.productId) });
};
