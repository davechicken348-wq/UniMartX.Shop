import { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { authenticate } from '../controllers/auth.controller';
import { NotificationService } from '../services/notification.service';
import {
  sendBuyerRefundStatusEmail,
  sendSellerRefundResponseEmail,
  sendSellerRefundProcessedEmail,
  sendSellerDisputeRaisedEmail,
  sendBuyerDisputeResultEmail,
  sendAdminDisputeAlertEmail,
  sendAdminRefundAlertEmail,
  getVerificationBaseUrl,
} from '../services/email.service';

export const getBuyerRefundDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) throw new AppError('Authentication required', 401);

    const { id } = req.params;
    const orderId = id;

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
          },
        },
        seller: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    if (!refund) {
      res.status(200).json({ success: true, data: null });
      return;
    }

    if (refund.buyerId !== userPayload.userId) {
      throw new AppError('Not authorized to view this refund', 403);
    }

    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
    const normalized: any = {
      ...refund,
      order: {
        ...refund.order,
        items: refund.order.items.map((item: any) => ({
          ...item,
          product: { ...item.product, image: item.product.image.startsWith('/uploads') ? `${BACKEND_URL}${item.product.image}` : item.product.image },
        })),
      },
      seller: {
        ...refund.seller,
        user: refund.seller.user,
      },
    };

    delete normalized.buyer;

    res.status(200).json({ success: true, data: normalized });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch refund details', 500);
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

export const buyRespondToRefund = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { response, message } = req.body;
    const seller = authenticate(req);

    if (!seller) throw new AppError('Authentication required', 401);

    if (!['approve', 'deny'].includes(response)) {
      throw new AppError('Response must be approve or deny', 400);
    }

    const refund = await prisma.refund.findUnique({
      where: { orderId },
      include: { order: { select: { id: true, orderNumber: true } }, buyer: { select: { id: true } } },
    });

    if (!refund) {
      throw new AppError('Refund not found', 404);
    }

    if (refund.sellerId !== seller.userId) {
      throw new AppError('Not authorized', 403);
    }

    if (refund.status !== 'refund_requested') {
      throw new AppError('This refund has already been responded to', 400);
    }

    if (response === 'deny' && !message) {
      throw new AppError('Please provide a reason for denying this refund', 400);
    }

    const updateData: any = {
      sellerResponse: message || response === 'approve' ? 'Refund approved' : 'Refund denied',
      sellerRespondedAt: new Date(),
    };

    if (response === 'approve') {
      updateData.status = 'seller_approved';
    } else {
      updateData.status = 'seller_denied';
    }

    const updated = await prisma.refund.update({
      where: { orderId },
      data: updateData,
    });

    await prisma.order.update({
      where: { id: refund.orderId },
      data: { status: response === 'approve' ? 'seller_approved' : 'seller_denied' },
    });

    await NotificationService.create({
      userId: refund.buyerId,
      type: 'order_refunded',
      title: response === 'approve' ? 'Refund approved by seller' : 'Refund denied by seller',
      message: response === 'approve'
        ? `The seller has approved your refund request for Order #${refund.orderNumber}.`
        : `The seller has denied your refund request for Order #${refund.orderNumber}. ${message || 'You can dispute this decision.'}`,
      priority: 'high',
      actionUrl: `/pages/buyer/orders/order-details.html?id=${refund.orderId}`,
      orderId: refund.orderId,
      metadata: { refundId: refund.id, decision: response, sellerNote: message },
    });

    const frontendBase = getVerificationBaseUrl();
    const buyerOrderUrl = `${frontendBase}/pages/buyer/orders/order-details.html?id=${refund.orderId}`;
    const buyerUser = await prisma.user.findUnique({ where: { id: refund.buyerId }, select: { email: true, firstName: true, lastName: true } });
    if (buyerUser?.email) {
      void sendBuyerRefundStatusEmail(buyerUser.email, `${buyerUser.firstName} ${buyerUser.lastName}`.trim(), refund.orderNumber, response === 'approve' ? 'seller_approved' : 'seller_denied', buyerOrderUrl, message || undefined);
    }

    const sellerUser = await prisma.user.findUnique({ where: { id: seller.userId }, select: { email: true } });
    const sellerOrderUrl = `${frontendBase}/pages/seller/private/orders/order-details.html?id=${refund.orderId}`;
    if (sellerUser?.email) {
      const sellerDb = await prisma.seller.findUnique({ where: { userId: seller.userId }, select: { storeName: true } });
      void sendSellerRefundResponseEmail(sellerUser.email, sellerDb?.storeName || 'Seller', refund.orderNumber, 'A buyer', response, message || '', sellerOrderUrl);
    }

    res.status(200).json({
      success: true,
      data: updated,
      message: response === 'approve' ? 'Refund approved. Waiting for buyer confirmation.' : 'Refund denied. Buyer may dispute.',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to process refund response', 500);
  }
};

export const confirmRefundReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userPayload = authenticate(req);

    if (!userPayload) throw new AppError('Authentication required', 401);

    const refund = await prisma.refund.findUnique({
      where: { orderId: id },
      include: {
        order: { select: { id: true, orderNumber: true, totalAmount: true } },
        seller: { include: { user: { select: { id: true } } } },
      },
    });

    if (!refund) throw new AppError('Refund not found', 404);

    if (refund.buyerId !== userPayload.userId) {
      throw new AppError('Not authorized', 403);
    }

    if (refund.status !== 'seller_approved') {
      throw new AppError('This refund cannot be confirmed at this stage', 400);
    }

    const updated = await prisma.refund.update({
      where: { orderId: id },
      data: { status: 'refunded', buyerConfirmedAt: new Date() },
    });

    await prisma.order.update({
      where: { id: refund.orderId },
      data: { status: 'refunded' },
    });

    await NotificationService.create({
      userId: refund.seller.user.id,
      type: 'order_refunded',
      title: 'Refund completed',
      message: `Buyer confirmed receipt of refund for Order #${refund.orderNumber}.`,
      priority: 'high',
      actionUrl: `/pages/seller/private/orders/order-details.html?id=${refund.orderId}`,
      orderId: refund.orderId,
    });

    const sellerUser = await prisma.user.findUnique({ where: { id: refund.seller.user.id }, select: { email: true, firstName: true, lastName: true } });
    const sellerOrderUrl = `${getVerificationBaseUrl()}/pages/seller/private/orders/order-details.html?id=${refund.orderId}`;
    if (sellerUser?.email) {
      void sendSellerRefundProcessedEmail(sellerUser.email, `${sellerUser.firstName} ${sellerUser.lastName}`.trim(), refund.orderNumber, parseFloat(refund.order.totalAmount.toString()), sellerOrderUrl);
    }

    void sendAdminRefundAlertEmail(
      process.env.SUPPORT_EMAIL || process.env.EMAIL_USER || 'dexecommerce2@gmail.com',
      refund.order.orderNumber,
      'A seller',
      parseFloat(refund.order.totalAmount.toString()),
      'Buyer confirmed refund receipt',
      `${getVerificationBaseUrl()}/pages/admin/refunds.html`
    );

    res.status(200).json({ success: true, data: updated, message: 'Refund confirmed successfully' });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to confirm refund receipt', 500);
  }
};

export const disputeRefund = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userPayload = authenticate(req);

    if (!userPayload) throw new AppError('Authentication required', 401);

    const refund = await prisma.refund.findUnique({
      where: { orderId: id },
      include: {
        order: {
          include: {
            items: {
              select: {
                quantity: true,
                price: true,
                product: { select: { name: true, image: true } },
              },
            },
            buyer: { select: { firstName: true, lastName: true, email: true } },
            seller: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    if (!refund) throw new AppError('Refund not found', 404);

    if (refund.buyerId !== userPayload.userId) {
      throw new AppError('Not authorized', 403);
    }

    const disputableStatuses = ['seller_approved', 'seller_denied'];
    if (!disputableStatuses.includes(refund.status)) {
      throw new AppError('This refund cannot be disputed at this stage', 400);
    }

    const updated = await prisma.refund.update({
      where: { orderId: id },
      data: { status: 'disputed', disputeReason: reason || 'Buyer disputed the refund decision' },
    });

    await NotificationService.create({
      userId: refund.order.seller.user.id,
      type: 'order_refunded',
      title: 'Refund disputed',
      message: `Buyer has disputed the refund decision for Order #${refund.orderNumber}. Admin will review.`,
      priority: 'high',
      actionUrl: `/pages/seller/private/orders/order-details.html?id=${refund.orderId}`,
      orderId: refund.orderId,
    });

    const frontendBase = getVerificationBaseUrl();
    const disputeReason = reason || 'Buyer disputed the refund decision';

    const sellerUser = await prisma.user.findUnique({ where: { id: refund.order.seller.user.id }, select: { email: true, firstName: true, lastName: true } });
    const sellerOrderUrl = `${frontendBase}/pages/seller/private/orders/order-details.html?id=${refund.orderId}`;
    if (sellerUser?.email) {
      void sendSellerDisputeRaisedEmail(sellerUser.email, `${sellerUser.firstName} ${sellerUser.lastName}`.trim(), refund.orderNumber, `${refund.order.buyer.firstName} ${refund.order.buyer.lastName}`.trim(), disputeReason, sellerOrderUrl);
    }

    void sendAdminDisputeAlertEmail(
      process.env.SUPPORT_EMAIL || process.env.EMAIL_USER || 'dexecommerce2@gmail.com',
      refund.orderNumber,
      `${refund.order.seller.user.firstName} ${refund.order.seller.user.lastName}`.trim(),
      `${refund.order.buyer.firstName} ${refund.order.buyer.lastName}`.trim(),
      disputeReason,
      `${frontendBase}/pages/admin/refunds.html`
    );

    res.status(200).json({ success: true, data: updated, message: 'Dispute submitted. Admin will review.' });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to submit dispute', 500);
  }
};

export const arbitrateRefund = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { decision, adminNote } = req.body;
    const userPayload = (req as any).admin;

    if (!decision || !['approve', 'deny'].includes(decision)) {
      throw new AppError('Decision must be approve or deny', 400);
    }

    const refund = await prisma.refund.findUnique({
      where: { orderId },
      include: { order: true, buyer: { select: { firstName: true, lastName: true, email: true, id: true } }, seller: { include: { user: { select: { firstName: true, lastName: true, email: true, id: true } } } } },
    });

    if (!refund) {
      throw new AppError('Refund not found', 404);
    }

    if (refund.status !== 'disputed') {
      throw new AppError('Only disputed refunds can be arbitrated', 400);
    }

    const finalStatus = decision === 'approve' ? 'refunded' : 'denied';
    const orderNewStatus = decision === 'approve' ? 'refunded' : 'delivered';

    const updated = await prisma.refund.update({
      where: { orderId },
      data: {
        status: finalStatus,
        adminId: userPayload.userId,
        adminNote: adminNote || (decision === 'approve' ? 'Approved by admin' : 'Denied by admin'),
        adminDecision: decision,
      },
    });

    await prisma.order.update({
      where: { id: refund.orderId },
      data: { status: orderNewStatus },
    });

    const buyer = refund.buyer as any;
    const order = refund.order;
    const seller = refund.seller;

    await NotificationService.create({
      userId: buyer.id,
      type: 'order_refunded',
      title: `Refund ${decision === 'approve' ? 'approved' : 'denied'} by admin`,
      message: `Admin has ${decision === 'approve' ? 'approved' : 'denied'} the disputed refund for Order #${order.orderNumber}. ${adminNote || ''}`,
      priority: 'high',
      actionUrl: `/pages/buyer/orders/order-details.html?id=${order.id}`,
      orderId: refund.orderId,
      metadata: { refundId: refund.id, decision, adminNote },
    });

    await NotificationService.create({
      userId: (seller as any).user.id,
      type: 'order_refunded',
      title: `Refund ${decision === 'approve' ? 'approved' : 'denied'} by admin`,
      message: `Admin has ${decision === 'approve' ? 'approved' : 'denied'} the disputed refund for Order #${order.orderNumber}. ${adminNote || ''}`,
      priority: 'high',
      actionUrl: `/pages/seller/private/orders/order-details.html?id=${order.id}`,
      orderId: refund.orderId,
      metadata: { refundId: refund.id, decision, adminNote },
    });

    const orderUrl = `${getVerificationBaseUrl()}/pages/buyer/orders/order-details.html?id=${order.id}`;
    const adminEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER || 'dexecommerce2@gmail.com';
    void sendBuyerDisputeResultEmail(buyer.email, `${buyer.firstName} ${buyer.lastName}`.trim(), order.orderNumber, decision, orderUrl, adminNote);
    void sendAdminDisputeAlertEmail(adminEmail, order.orderNumber, `${seller.user.firstName} ${seller.user.lastName}`.trim(), `${buyer.firstName} ${buyer.lastName}`.trim(), `Admin ${decision === 'approve' ? 'upheld' : 'denied'} the dispute. Note: ${adminNote || 'None'}`, orderUrl);

    res.status(200).json({
      success: true,
      data: updated,
      message: `Refund ${decision === 'approve' ? 'approved' : 'denied'} successfully`,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to arbitrate refund', 500);
  }
};

export const getAdminRefunds = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;
    const filter = (req.query.filter as string) || 'all';

    let where: any = {};
    if (filter === 'disputed') where.status = 'disputed';
    else if (filter === 'pending') where.status = { in: ['refund_requested', 'seller_approved', 'seller_denied'] };
    else if (filter === 'resolved') where.status = { in: ['refunded', 'denied'] };
    else if (filter !== 'all') where.status = { in: filter.split(',') };

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
              paymentMethod: true,
              items: {
                select: {
                  quantity: true,
                  product: { select: { name: true } },
                },
              },
              buyer: { select: { firstName: true, lastName: true, email: true } },
              seller: {
                include: {
                  user: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
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
    throw new AppError('Failed to fetch admin refunds', 500);
  }
};

export const getAdminRefundDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;

    const refund = await prisma.refund.findUnique({
      where: { orderId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            paymentMethod: true,
            paymentDetails: true,
            createdAt: true,
            items: {
              select: {
                quantity: true,
                price: true,
                product: { select: { name: true, image: true } },
              },
            },
            buyer: { select: { firstName: true, lastName: true, email: true, phone: true } },
            seller: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
            address: true,
          },
        },
      },
    });

    if (!refund) {
      throw new AppError('Refund not found', 404);
    }

    res.status(200).json({ success: true, data: refund });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch refund detail', 500);
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

    const refundWithNewFields = refund ? {
      ...refund,
      refundMethod: refund.refundMethod,
      sellerProof: refund.sellerProof,
      buyerConfirmedAt: refund.buyerConfirmedAt,
      disputeReason: refund.disputeReason,
    } : null;

    if (!refund) {
      res.status(200).json({ success: true, data: null });
      return;
    }

    if (refund.sellerId !== seller.userId) {
      throw new AppError('Not authorized', 403);
    }

    res.status(200).json({ success: true, data: refundWithNewFields });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch refund detail', 500);
  }
};
