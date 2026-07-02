import { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { authenticate, type JwtPayload } from '../controllers/auth.controller';
import { NotificationService } from '../services/notification.service';
import { sendSellerFollowedEmail, getBackendBaseUrl } from '../services/email.service';

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

// ── Helpers ─────────────────────────────────────────────────
function getBuyerId(userPayload: JwtPayload | null): string {
  if (!userPayload || userPayload.role !== 'buyer') {
    throw new AppError('Only buyers can follow sellers', 403);
  }
  return userPayload.userId;
}

async function getSellerIdFromReq(req: Request): Promise<string> {
  const sellerId = req.params.sellerId || req.body.sellerId;
  if (!sellerId) throw new AppError('sellerId is required', 400);

  const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
  if (!seller) throw new AppError('Seller not found', 404);
  return sellerId;
}

// ── Toggle follow ───────────────────────────────────────────
export const toggleFollow = async (req: Request, res: Response): Promise<void> => {
  try {
    const buyerUserId = getBuyerId(authenticate(req)!);
    const sellerId    = await getSellerIdFromReq(req);

    // Prevent self-follow
    const sellerUser = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { userId: true },
    });
    if (sellerUser?.userId === buyerUserId) {
      throw new AppError('You cannot follow yourself', 400);
    }

    // Find buyer record
    const buyer = await prisma.buyer.findUnique({ where: { userId: buyerUserId } });
    if (!buyer) throw new AppError('Buyer profile not found', 404);

    // Check existing follow
    const existing = await prisma.follow.findFirst({
        where: { buyerId: buyer.id, sellerId },
    });

    let isFollowing: boolean;
    let followerCount: number;

    if (existing) {
        await prisma.follow.delete({ where: { id: existing.id } });
        isFollowing = false;
        followerCount = await prisma.follow.count({ where: { sellerId } });
    } else {
        await prisma.follow.create({
            data: { buyerId: buyer.id, sellerId },
        });
        isFollowing = true;
        followerCount = await prisma.follow.count({ where: { sellerId } });

        // Resolve seller user id for notification target
        const [sellerUser, buyerUser] = await Promise.all([
            prisma.seller.findUnique({
                where: { id: sellerId },
                select: { userId: true },
            }),
            prisma.user.findUnique({
                where: { id: buyerUserId },
                select: { firstName: true, lastName: true, email: true },
            }),
        ]);

        const buyerName = [buyerUser?.firstName, buyerUser?.lastName].filter(Boolean).join(' ') || 'A buyer';

        if (sellerUser) {
            await Promise.all([
                NotificationService.create({
                    userId: buyerUserId,
                    type: 'seller_followed',
                    title: 'Seller followed',
                    message: `You are now following this seller.`,
                    actionUrl: `/pages/public/stores/stores.html`,
                    icon: 'user-plus',
                    priority: 'low',
                }),
                NotificationService.create({
                    userId: sellerUser.userId,
                    type: 'new_follower',
                    title: 'New follower',
                    message: `You have a new follower!`,
                    actionUrl: `/pages/seller/public/profile/profile.html`,
                    icon: 'users',
                    priority: 'low',
                }),
                // External email notifications (don't throw on failure)
                sendSellerFollowedEmail(
                    buyerUser?.email || '',
                    buyerName,
                    (await prisma.seller.findUnique({ where: { id: sellerId }, select: { storeName: true } }))?.storeName || 'Store',
                    `${getBackendBaseUrl()}/pages/seller/public/profile/profile.html?id=${sellerId}`
                ).catch(() => {}),
            ]);
        }
    }

    // Live follower count for this seller
    followerCount = await prisma.follow.count({ where: { sellerId } });

    res.status(200).json({ success: true, data: { isFollowing, followerCount } });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to toggle follow', 500);
  }
};

// ── Check follow status ─────────────────────────────────────
export const checkFollowStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    const sellerId = req.params.sellerId || req.body.sellerId;
    if (!sellerId) {
      res.status(200).json({ success: true, data: { isFollowing: false } });
      return;
    }

    const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) {
      res.status(200).json({ success: true, data: { isFollowing: false } });
      return;
    }

    // If no user payload (not logged in) or not a buyer, can't follow anyone
    if (!userPayload || userPayload.role !== 'buyer') {
      res.status(200).json({ success: true, data: { isFollowing: false, followerCount: await prisma.follow.count({ where: { sellerId } }) } });
      return;
    }

    const buyer = await prisma.buyer.findUnique({ where: { userId: userPayload.userId } });
    if (!buyer) {
      res.status(200).json({ success: true, data: { isFollowing: false, followerCount: await prisma.follow.count({ where: { sellerId } }) } });
      return;
    }

    const existing = await prisma.follow.findUnique({
      where: { buyerId_sellerId: { buyerId: buyer.id, sellerId } },
    });

    res.status(200).json({
      success: true,
      data: {
        isFollowing: !!existing,
        followerCount: await prisma.follow.count({ where: { sellerId } }),
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to check follow status', 500);
  }
};

// ── List who a buyer is following ───────────────────────────
export const getFollowedSellers = async (req: Request, res: Response): Promise<void> => {
  try {
    const buyerUserId = getBuyerId(authenticate(req)!);

    const buyer = await prisma.buyer.findUnique({ where: { userId: buyerUserId } });
    if (!buyer) throw new AppError('Buyer profile not found', 404);

    const follows = await prisma.follow.findMany({
      where: { buyerId: buyer.id },
      orderBy: { createdAt: 'desc' },
      include: {
        seller: {
          include: {
            user: { select: { firstName: true, lastName: true, avatar: true } },
            products: { where: { isActive: true }, take: 1, orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });

    const data = follows.map(f => ({
      id:              f.seller.id,
      sellerId:        f.seller.id,
      storeName:       f.seller.storeName,
      storeBanner:     absUrl(f.seller.storeBanner),
      storeAvatar:     absUrl(f.seller.storeAvatar),
      storeColor:      f.seller.storeColor,
      category:        f.seller.category,
      avgRating:       f.seller.products.length
        ? (f.seller.products.reduce((s, p) => s + (p.rating || 0), 0) / f.seller.products.length).toFixed(1)
        : '0.0',
      productCount:    f.seller.products.length,
      followedAt:      f.createdAt,
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to load followed sellers', 500);
  }
};

// ── List followers of a seller ──────────────────────────────
export const getSellerFollowers = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) throw new AppError('Authentication required', 401);

    const sellerId = req.params.sellerId || req.query.sellerId as string;
    if (!sellerId) throw new AppError('sellerId is required', 400);

    // Seller can only view their own followers
    const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller || seller.userId !== userPayload.userId) {
      throw new AppError('Not authorized', 403);
    }

    const follows = await prisma.follow.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: {
          include: {
            user: { select: { firstName: true, lastName: true, avatar: true, email: true } },
          },
        },
      },
    });

    const data = follows.map(f => ({
      id:        f.id,
      buyerId:   f.buyer.id,
      firstName: f.buyer.user.firstName,
      lastName:  f.buyer.user.lastName,
      avatar:    f.buyer.user.avatar,
      email:     f.buyer.user.email,
      followedAt: f.createdAt,
    }));

    res.status(200).json({ success: true, data, total: data.length });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to load followers', 500);
  }
};

export default { toggleFollow, checkFollowStatus, getFollowedSellers, getSellerFollowers };
