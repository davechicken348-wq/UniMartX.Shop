import { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { authenticate } from '../controllers/auth.controller';
import { NotificationService } from '../services/notification.service';
import { sendBuyerOrderStatusEmail, sendBuyerRefundStatusEmail, sendSellerRefundResponseEmail, sendAdminRefundAlertEmail, getVerificationBaseUrl } from '../services/email.service';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
function absUrl(path: string | null | undefined): string | null {
  const p = path || '';
  if (!p) return null;
  if (p.endsWith('/')) return null;
  if (p.startsWith('/uploads')) {
    try { return new URL(p, BACKEND_URL).href; } catch { return `${BACKEND_URL}${p}`; }
  }
  if (/^https?:/.test(p) || p.startsWith('data:') || p.startsWith('blob:')) return p;
  return `${BACKEND_URL}${p}`;
}

/**
 * GET /api/seller/dashboard
 * Get all dashboard data for the seller
 */
export const getSellerDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const seller = await prisma.seller.findUnique({
      where: { userId: userPayload.userId },
    });

    if (!seller) {
      throw new AppError('Seller account not found', 404);
    }

    const sellerId = seller.id;

    // Fetch all data in parallel
    const [
      totalRevenueAgg,
      totalOrders,
      pendingOrders,
      processingOrShippedCount,
      deliveredOrders,
      productsCount,
      avgRatingAgg,
      recentOrders,
      allOrderItems, // for top products calculation
      recentOrderDates, // for chart
      followersCount,
      recentFollowers,
      lowStockCount,
      userVerified,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { sellerId, status: { in: ['processing', 'shipped', 'delivered'] } },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({ where: { sellerId } }),
      prisma.order.count({ where: { sellerId, status: 'pending' } }),
      prisma.order.count({ where: { sellerId, status: { in: ['processing', 'shipped'] } } }),
      prisma.order.count({ where: { sellerId, status: 'delivered' } }),
      prisma.product.count({ where: { sellerId, isActive: true } }),
      prisma.product.aggregate({ where: { sellerId }, _avg: { rating: true } }),
      prisma.order.findMany({
        where: { sellerId },
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
            take: 1,
          },
        },
      }),
      // Fetch order items for top products (last 90 days)
      prisma.orderItem.findMany({
        where: {
          order: {
            sellerId,
            status: { in: ['processing', 'shipped', 'delivered'] },
            createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
        },
        select: {
          quantity: true,
          price: true,
          product: { select: { id: true, name: true, image: true } },
        },
      }),
      // Fetch orders from last 7 days for chart
      prisma.order.findMany({
        where: {
          sellerId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          status: { in: ['processing', 'shipped', 'delivered'] },
        },
        select: {
          createdAt: true,
          totalAmount: true,
        },
      }),
      prisma.follow.count({ where: { sellerId } }),
      prisma.follow.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          buyer: {
            include: {
              user: { select: { firstName: true, lastName: true, avatar: true, email: true } },
            },
          },
        },
      }),
      prisma.product.count({ where: { sellerId, stock: { lte: 5 } } }),
      prisma.user.findUnique({
        where: { id: seller.userId },
        select: { emailVerified: true },
      }),
    ]);

    // Compute top products
    const revenueByProduct = new Map();
    for (const item of allOrderItems) {
      const pid = item.product.id;
      const existing = revenueByProduct.get(pid) || { qty: 0, revenue: 0, name: item.product.name, image: item.product.image };
      revenueByProduct.set(pid, {
        qty: existing.qty + item.quantity,
        revenue: existing.revenue + parseFloat(item.price.toString()),
        name: item.product.name,
        image: existing.image,
      });
    }
    const topProducts = Array.from(revenueByProduct.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3)
      .map(p => ({ name: p.name, sales: p.qty, revenue: p.revenue, image: absUrl(p.image) }));

    // Compute daily revenue for last 7 days
    const revenueMap = new Map();
    for (const order of recentOrderDates) {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      const amount = parseFloat(order.totalAmount.toString());
      revenueMap.set(dateKey, (revenueMap.get(dateKey) || 0) + amount);
    }

    const last7Days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      last7Days.push({ day: dayName, revenue: revenueMap.get(dateStr) || 0 });
    }

    const revenue = totalRevenueAgg._sum.totalAmount || 0;

    const formattedRecentOrders = (recentOrders || []).map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      totalAmount: parseFloat(o.totalAmount.toString()),
      productName: o.items?.[0]?.product?.name || 'Multiple items',
    }));

    const estimatedRating = avgRatingAgg._avg.rating || 4.5;

    res.status(200).json({
      success: true,
      data: {
        stats: {
          revenue: parseFloat(revenue.toFixed(2)),
          orders: totalOrders,
          pending: pendingOrders,
          processingOrShipped: processingOrShippedCount,
          delivered: deliveredOrders,
          rating: Number(estimatedRating.toFixed(1)),
          products: productsCount,
          followers: followersCount,
          lowStock: lowStockCount,
        },
        recentOrders: formattedRecentOrders,
        verified: !!(userVerified && userVerified.emailVerified),
        profile: {
          verified: !!(userVerified && userVerified.emailVerified),
          storeAvatar: seller.storeAvatar || null,
          storeBanner: seller.storeBanner || null,
        },
        topProducts,
        chartData: last7Days.map(d => d.revenue),
        chartLabels: last7Days.map(d => d.day),
        followers: recentFollowers.map(f => ({
          id: f.id,
          firstName: f.buyer.user.firstName,
          lastName: f.buyer.user.lastName,
          avatar: f.buyer.user.avatar,
          email: f.buyer.user.email,
          followedAt: f.createdAt,
        })),
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Dashboard error:', error);
    throw new AppError('Failed to fetch seller dashboard data', 500);
  }
};

/**
 * GET /api/seller/orders?page&limit&status&search
 * Get paginated orders for the seller with optional filtering
 */
export const getSellerOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const seller = await prisma.seller.findUnique({
      where: { userId: userPayload.userId },
    });

    if (!seller) {
      throw new AppError('Seller account not found', 404);
    }

    const sellerId = seller.id;

    const page   = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit  = Math.min(100, parseInt(req.query.limit as string) || 15);
    const skip   = (page - 1) * limit;
    const status = (req.query.status as string) || '';
    const search = (req.query.search as string) || '';

    const where: any = { sellerId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { buyer: { firstName: { contains: search, mode: 'insensitive' } } },
        { buyer: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [orders, total, pendingCount, shippedCount, deliveredCount, cancelledCount] = await Promise.all([
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
          fulfillmentType: true,
          sellerDeliveryFee: true,
          createdAt: true,
          buyer: { select: { firstName: true, lastName: true, email: true } },
          items: {
            select: {
              quantity: true,
              price: true,
              product: { select: { name: true, image: true } },
            },
            take: 1,
          },
        },
      }),
      prisma.order.count({ where }),
      prisma.order.count({ where: { sellerId, status: 'pending' } }),
      prisma.order.count({ where: { sellerId, status: 'shipped' } }),
      prisma.order.count({ where: { sellerId, status: 'delivered' } }),
      prisma.order.count({ where: { sellerId, status: 'cancelled' } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        orders,
        total,
        pages: totalPages,
        page,
        counts: {
          all: total,
          pending: pendingCount,
          shipped: shippedCount,
          delivered: deliveredCount,
          cancelled: cancelledCount,
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Get seller orders error:', error);
    throw new AppError('Failed to fetch orders', 500);
  }
};

/**
 * PATCH /api/seller/orders/:id/status
 * Update order status for seller
 */
export const updateSellerOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const { id } = req.params;
    const { status } = req.body;

    const seller = await prisma.seller.findUnique({
      where: { userId: userPayload.userId },
    });

    if (!seller) {
      throw new AppError('Seller account not found', 404);
    }

    const ALLOWED_SELLER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!ALLOWED_SELLER_STATUSES.includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order || order.sellerId !== seller.id) {
      throw new AppError('Order not found', 404);
    }

    const currentStatus = order.status;
    if (currentStatus === 'delivered') {
      throw new AppError('Delivered orders cannot be modified', 400);
    }

    const FORWARD_ONLY: Record<string, string[]> = {
      pending:   ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped:    ['delivered', 'cancelled'],
    };

    const allowedNext = FORWARD_ONLY[currentStatus] || [];
    if (!allowedNext.includes(status)) {
      throw new AppError(`Cannot transition from ${currentStatus} to ${status}`, 400);
    }

    await prisma.order.update({
      where: { id },
      data: { status },
    });

    if (!['pending', 'cancelled'].includes(status)) {
      const sellerRecord = await prisma.seller.findUnique({ where: { id: order.sellerId }, select: { storeName: true } });
      const buyerUser = await prisma.user.findUnique({ where: { id: order.buyerId }, select: { email: true, firstName: true, lastName: true } });
      if (buyerUser?.email) {
        void sendBuyerOrderStatusEmail(buyerUser.email, `${buyerUser.firstName} ${buyerUser.lastName}`.trim(), order.orderNumber, status, `${getVerificationBaseUrl()}/pages/buyer/orders/order-details.html?id=${order.id}`, sellerRecord?.storeName || 'Seller');
      }
    }

    res.status(200).json({ success: true, message: 'Order status updated' });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Update order status error:', error);
    throw new AppError('Failed to update order status', 500);
  }
};

/**
 * GET /api/seller/orders/:id
 * Get single order details for seller
 */
export const getSellerOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const { id } = req.params;

    const seller = await prisma.seller.findUnique({
      where: { userId: userPayload.userId },
    });

    if (!seller) {
      throw new AppError('Seller account not found', 404);
    }

    const order = await prisma.order.findUnique({
      where: { id: req.params.id, sellerId: seller.id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        fulfillmentType: true,
        sellerDeliveryFee: true,
        createdAt: true,
        notes: true,
        buyer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                image: true,
              },
            },
          },
        },
        address: true,
      },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    const normalizedOrder = {
      ...order,
      totalAmount: parseFloat(order.totalAmount.toString()),
      items: (order.items || []).map((it: any) => ({
        ...it,
        product: it.product ? { ...it.product, image: absUrl(it.product.image || '') } : it.product,
      })),
    };

    res.status(200).json({
      success: true,
      data: normalizedOrder,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Get seller order error:', error);
    throw new AppError('Failed to fetch order', 500);
  }
};

export const getSellerRefunds = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) throw new AppError('Authentication required', 401);

    const seller = await prisma.seller.findUnique({
      where: { userId: userPayload.userId },
    });

    if (!seller) {
      throw new AppError('Seller account not found', 404);
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;
    const status = (req.query.status as string) || '';

    const where: any = { sellerId: seller.id };
    if (status) where.status = status;

    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              totalAmount: true,
              items: {
                select: {
                  quantity: true,
                  product: { select: { name: true, image: true } },
                },
              },
              buyer: { select: { firstName: true, lastName: true, email: true } },
            },
          },
          buyer: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.refund.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: { refunds, total, pages: Math.ceil(total / limit), page },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch refunds', 500);
  }
};

export const respondToRefund = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) throw new AppError('Authentication required', 401);

    const { orderId } = req.params;
    const { response, message, refundMethod, sellerProof } = req.body;

    const seller = await prisma.seller.findUnique({
      where: { userId: userPayload.userId },
    });

    if (!seller) {
      throw new AppError('Seller account not found', 404);
    }

    if (!response || !['approve', 'deny'].includes(response)) {
      throw new AppError('Response must be either approve or deny', 400);
    }

    if (response === 'approve') {
      if (!refundMethod || !['cash', 'momo', 'store_credit'].includes(refundMethod)) {
        throw new AppError('Please specify how the refund was made (cash, momo, or store_credit)', 400);
      }
      if (!sellerProof || !sellerProof.trim()) {
        throw new AppError('Please provide proof or details of the refund', 400);
      }
    }

    const refund = await prisma.refund.findUnique({
      where: { orderId },
      include: { order: true, buyer: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    if (!refund) {
      throw new AppError('Refund not found', 404);
    }

    if (refund.sellerId !== seller.id) {
      throw new AppError('Not authorized to respond to this refund', 403);
    }

    if (refund.status !== 'refund_requested') {
      throw new AppError('This refund has already been responded to', 400);
    }

    const newStatus = response === 'approve' ? 'seller_approved' : 'seller_denied';

    const updated = await prisma.refund.update({
      where: { orderId },
      data: {
        status: newStatus,
        sellerResponse: message || (response === 'approve' ? 'Refund approved' : 'Refund denied'),
        sellerRespondedAt: new Date(),
        refundMethod: response === 'approve' ? refundMethod : null,
        sellerProof: response === 'approve' ? sellerProof : null,
      },
      include: { order: true },
    });

    await prisma.order.update({
      where: { id: refund.orderId },
      data: { status: newStatus },
    });

    const buyer = refund.buyer as any;
    const order = refund.order;

    await NotificationService.create({
      userId: buyer.id,
      type: 'order_refunded',
      title: response === 'approve' ? 'Refund approved by seller' : 'Refund denied by seller',
      message: response === 'approve'
        ? `The seller has approved your refund request for Order #${order.orderNumber}. Please confirm receipt of your refund.`
        : `The seller has denied your refund request for Order #${order.orderNumber}. ${message || 'You can dispute this decision.'}`,
      priority: 'high',
      actionUrl: `/pages/buyer/orders/order-details.html?id=${order.id}`,
      orderId: refund.orderId,
      metadata: { refundId: refund.id, response, refundMethod, sellerProof },
    });

    const orderUrl = `${getVerificationBaseUrl()}/pages/buyer/orders/order-details.html?id=${order.id}`;
    void sendBuyerRefundStatusEmail(buyer.email, `${buyer.firstName} ${buyer.lastName}`.trim(), order.orderNumber, response === 'approve' ? 'seller_approved' : 'seller_denied', orderUrl, message || undefined);

    const sellerUser = await prisma.user.findUnique({ where: { id: seller.userId }, select: { email: true, firstName: true, lastName: true } });
    const sellerOrderUrl = `${getVerificationBaseUrl()}/pages/seller/private/orders/order-details.html?id=${refund.orderId}`;
    if (sellerUser?.email) {
      void sendSellerRefundResponseEmail(sellerUser.email, `${sellerUser.firstName} ${sellerUser.lastName}`.trim(), order.orderNumber, `${buyer.firstName} ${buyer.lastName}`.trim(), response, message || '', sellerOrderUrl);
    }

    res.status(200).json({
      success: true,
      data: updated,
      message: response === 'approve' ? 'Refund approved. Awaiting buyer confirmation.' : 'Refund denied. Buyer may dispute.',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to process refund response', 500);
  }
};

export const getSellerRefundDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) throw new AppError('Authentication required', 401);

    const { orderId } = req.params;

    const seller = await prisma.seller.findUnique({
      where: { userId: userPayload.userId },
    });

    if (!seller) {
      throw new AppError('Seller account not found', 404);
    }

    const refund = await prisma.refund.findUnique({
      where: { orderId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            items: {
              select: {
                quantity: true,
                product: { select: { name: true, image: true } },
              },
            },
            buyer: { select: { firstName: true, lastName: true, email: true } },
            address: true,
          },
        },
        buyer: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    if (!refund) {
      throw new AppError('Refund not found', 404);
    }

    if (refund.sellerId !== seller.id) {
      throw new AppError('Not authorized', 403);
    }

    res.status(200).json({ success: true, data: refund });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch refund detail', 500);
  }
};
