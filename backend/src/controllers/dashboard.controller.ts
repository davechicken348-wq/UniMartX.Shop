import { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { authenticate } from '../controllers/auth.controller';
import { NotificationService } from '../services/notification.service';
import { sendSellerRefundRequestedEmail } from '../services/email.service';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
function absUrl(path: string | null | undefined): string | null {
  const p = path || '';
  if (!p) return null;
  if (/^https?:/.test(p) || p.startsWith('data:') || p.startsWith('blob:')) return p;
  return `${BACKEND_URL}${p}`;
}

/**
 * GET /api/buyer/dashboard
 * Get all dashboard data for the buyer (stats, recent orders, profile completion)
 */
export const getBuyerDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const userId = userPayload.userId;

    // Fetch all dashboard data in parallel
    const [
      user,
      totalOrders,
      pendingCount,
      deliveredCount,
      wishlistCount,
      cartCount,
      recentOrders,
      addresses,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          emailVerified: true,
          phone: true,
          avatar: true,
          createdAt: true,
        },
      }),
      prisma.order.count({ where: { buyerId: userId } }),
      prisma.order.count({
        where: { buyerId: userId, status: { in: ['processing', 'shipped'] } },
      }),
      prisma.order.count({ where: { buyerId: userId, status: 'delivered' } }),
      prisma.wishlist.count({ where: { userId } }),
      prisma.cartItem.count({ where: { cart: { userId } } }),
      prisma.order.findMany({
        where: { buyerId: userId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          items: {
            select: {
              quantity: true,
              product: { select: { name: true, image: true } },
            },
          },
        },
      }),
      prisma.address.findMany({ where: { userId }, take: 1 }),
    ]);

    // Look up buyer record and followed sellers in parallel
    const buyer = await prisma.buyer.findUnique({ where: { userId }, select: { id: true } });

    let followedSellers: any[] = [];
    if (buyer) {
      followedSellers = await prisma.follow.findMany({
        where: { buyerId: buyer.id },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: {
            include: {
              user: { select: { firstName: true, lastName: true } },
              products: { where: { isActive: true }, take: 1, select: { name: true, image: true } },
            },
          },
        },
      });
    }

    // Normalize image URLs to absolute backend URLs
    const normalizedRecentOrders = (recentOrders || []).map((o: any) => ({
      ...o,
      items: (o.items || []).map((it: any) => ({
        ...it,
        product: it.product ? { ...it.product, image: absUrl(it.product.image || '') } : it.product,
      })),
    }));

    // Calculate profile completion (same logic as profile.js)
    const completionItems = [
      { done: user?.emailVerified,    label: 'Email verified' },
      { done: !!user?.phone,           label: 'Phone number added' },
      { done: !!user?.avatar,          label: 'Profile photo added' },
      { done: (addresses || []).length > 0,    label: 'Delivery address added' },
    ];
    const completed = completionItems.filter(i => i.done).length;
    const completionPct = Math.round((completed / completionItems.length) * 100);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalOrders,
          pendingDelivery: pendingCount,
          delivered: deliveredCount,
          wishlistItems: wishlistCount,
          cartItems: cartCount,
        },
        recentOrders: normalizedRecentOrders,
        profileCompletion: {
          percentage: completionPct,
          items: completionItems,
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch dashboard data', 500);
  }
};

/**
 * GET /api/buyer/orders?page&limit&status&search
 * Get paginated orders for the buyer with optional filtering
 */
export const getBuyerOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const userId = userPayload.userId;

    const page   = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit  = Math.min(100, parseInt(req.query.limit as string) || 15);
    const skip   = (page - 1) * limit;
    const status = (req.query.status as string) || '';
    const search = (req.query.search as string) || '';

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refund_requested', 'disputed', 'refunded'];
    const where: any = { buyerId: userId };
    if (status && validStatuses.includes(status)) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { items: { some: { product: { name: { contains: search, mode: 'insensitive' } } } } },
      ];
    }

    const [orders, total, pendingCount, processingCount, shippedCount, deliveredCount, cancelledCount] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          items: {
            select: {
              quantity: true,
              product: { select: { name: true, image: true } },
            },
          },
        },
      }),
      prisma.order.count({ where }),
      prisma.order.count({ where: { buyerId: userId, status: 'pending'    as any } }),
      prisma.order.count({ where: { buyerId: userId, status: 'processing' as any } }),
      prisma.order.count({ where: { buyerId: userId, status: 'shipped'    as any } }),
      prisma.order.count({ where: { buyerId: userId, status: 'delivered'  as any } }),
      prisma.order.count({ where: { buyerId: userId, status: 'cancelled'  as any } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Normalize image URLs
    const normalizedOrders = orders.map((order: any) => ({
      ...order,
      items: order.items.map((item: any) => ({
        ...item,
        product: { ...item.product, image: absUrl(item.product.image || '') },
      })),
    }));

    res.status(200).json({
      success: true,
      data: {
        orders: normalizedOrders,
        total,
        pages: totalPages,
        page,
        counts: {
          all: total,
          pending: pendingCount,
          processing: processingCount,
          shipped: shippedCount,
          delivered: deliveredCount,
          cancelled: cancelledCount,
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Get buyer orders error:', error);
    throw new AppError('Failed to fetch orders', 500);
  }
};

/**
 * GET /api/buyer/orders/latest
 * Get the most recent order for the buyer
 */
export const getBuyerLatestOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const userId = userPayload.userId;

    const order = await prisma.order.findFirst({
      where: { buyerId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        notes: true,
        paymentMethod: true,
        paymentDetails: true,
        seller: {
          select: {
            storeName: true,
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
            storeAvatar: true,
            pickupAddress: true,
          },
        },
        address: {
          select: {
            street: true,
            city: true,
            state: true,
            country: true,
            notes: true,
          },
        },
        items: {
          select: {
            quantity: true,
            price: true,
            product: { select: { name: true, image: true, seller: { select: { storeName: true } } } },
          },
        },
      },
    });

    if (!order) {
      throw new AppError('No orders found', 404);
    }

    const normalizedOrder = {
      ...order,
      totalAmount: parseFloat(order.totalAmount.toString()),
      paymentDetails: order.paymentDetails || {},
      seller: order.seller
        ? {
            ...order.seller,
            storeAvatar: absUrl((order.seller as any).storeAvatar || ''),
          }
        : order.seller,
      items: order.items.map((item: any) => ({
        ...item,
        product: { ...item.product, image: absUrl(item.product.image || '') },
      })),
    };

    res.status(200).json({
      success: true,
      data: normalizedOrder,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Get buyer latest order error:', error);
    throw new AppError('Failed to fetch latest order', 500);
  }
};

/**
 * GET /api/buyer/orders/:id
 * Get single order details for buyer
 */
export const getBuyerOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const { id } = req.params;
    const userId = userPayload.userId;

    const order = await prisma.order.findUnique({
      where: { id, buyerId: userId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        notes: true,
        paymentMethod: true,
        paymentDetails: true,
        seller: {
          select: {
            storeName: true,
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
            storeAvatar: true,
            pickupAddress: true,
          },
        },
        address: {
          select: {
            street: true,
            city: true,
            state: true,
            country: true,
            notes: true,
          },
        },
        items: {
          select: {
            quantity: true,
            price: true,
            product: { select: { name: true, image: true, seller: { select: { storeName: true } } } },
          },
        },
      },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Normalize image URLs
    const normalizedOrder = {
      ...order,
      totalAmount: parseFloat(order.totalAmount.toString()),
      paymentDetails: order.paymentDetails || {},
      seller: order.seller
        ? {
            ...order.seller,
            storeAvatar: absUrl((order.seller as any).storeAvatar || ''),
          }
        : order.seller,
      items: order.items.map((item: any) => ({
        ...item,
        product: { ...item.product, image: absUrl(item.product.image || '') },
      })),
    };

    res.status(200).json({
      success: true,
      data: normalizedOrder,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Get buyer order error:', error);
    throw new AppError('Failed to fetch order', 500);
  }
};

export const requestRefund = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) throw new AppError('Authentication required', 401);

    const { id } = req.params;
    const { reason, message } = req.body;

    const evidence: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      evidence.push(...req.files.map((f: any) => `/uploads/${f.filename}`));
    } else if (req.body.evidence && typeof req.body.evidence === 'string') {
      try {
        const parsed = JSON.parse(req.body.evidence);
        if (Array.isArray(parsed)) evidence.push(...parsed);
      } catch {}
    }

    const order = await prisma.order.findUnique({
      where: { id, buyerId: userPayload.userId },
      include: {
        seller: { select: { userId: true, storeName: true, user: { select: { firstName: true } } } },
        items: { select: { quantity: true, product: { select: { name: true } } } },
      },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (!['processing', 'shipped', 'delivered'].includes(order.status)) {
      throw new AppError('Refund cannot be requested for this order status', 400);
    }

    const existing = await prisma.refund.findUnique({
      where: { orderId: id },
    });

    if (existing) {
      throw new AppError('A refund request already exists for this order', 400);
    }

    const refund = await prisma.refund.create({
      data: {
        orderId: id,
        orderNumber: order.orderNumber,
        buyerId: userPayload.userId,
        sellerId: order.sellerId,
        amount: order.totalAmount,
        reason,
        message: message || null,
        evidence,
      },
    });

    await prisma.order.update({
      where: { id },
      data: { status: 'refund_requested' },
    });

    const sellerName = order.seller?.user?.firstName || 'Seller';
    const refundSummary = order.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ');
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    const orderUrl = `${frontendBase}/pages/buyer/orders/order-details.html?id=${order.id}`;

    await NotificationService.create({
      userId: order.seller.userId,
      type: 'order_refunded',
      title: 'Refund requested',
      message: `Refund requested for Order #${order.orderNumber}. Reason: ${reason}. Items: ${refundSummary}.`,
      priority: 'high',
      actionUrl: `/pages/seller/private/orders/order-details.html?id=${order.id}`,
      orderId: order.id,
      metadata: { refundId: refund.id, reason, message },
    });

    const sellerUser = await prisma.user.findUnique({ where: { id: order.seller.userId }, select: { email: true } });
    const buyerUser = await prisma.user.findUnique({ where: { id: userPayload.userId }, select: { firstName: true, lastName: true } });
    const buyerName = buyerUser ? `${buyerUser.firstName} ${buyerUser.lastName}`.trim() : 'A buyer';

    if (sellerUser?.email) {
      void sendSellerRefundRequestedEmail(
        sellerUser.email,
        sellerName,
        order.orderNumber,
        buyerName,
        reason,
        message,
        orderUrl
      );
    }

    res.status(201).json({ success: true, data: refund });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Request refund error:', error);
    throw new AppError('Failed to process refund request', 500);
  }
};

