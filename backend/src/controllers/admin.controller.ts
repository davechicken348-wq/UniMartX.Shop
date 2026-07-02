import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { JwtPayload } from '../controllers/auth.controller';
import { sendBuyerOrderStatusEmail, getVerificationBaseUrl } from '../services/email.service';

const ADMIN_REGISTER_SECRET = process.env.ADMIN_REGISTER_SECRET;

/** POST /api/admin/register — create first super admin, guarded by secret */
export const registerAdmin = async (req: Request, res: Response): Promise<void> => {
  if (!ADMIN_REGISTER_SECRET) {
    throw new AppError('Admin registration is not configured on this server', 500);
  }

  const { adminSecret, email, firstName, password } = req.body;

  if (adminSecret !== ADMIN_REGISTER_SECRET) {
    throw new AppError('Invalid setup secret', 403);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('Email already registered', 409);
  }

  // Check if any admin already exists
  const adminCount = await prisma.user.count({ where: { role: 'admin' } });
  if (adminCount > 0) {
    throw new AppError('Admin account already exists. Setup is complete.', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName: firstName.trim(),
      lastName: '',
      role: 'admin',
      emailVerified: true,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
    },
  });

  res.status(201).json({
    success: true,
    data: admin,
    message: 'Admin account created successfully',
  });
};

/** GET /api/admin/users/count — total buyer count */
export const getUserCount = async (_req: Request, res: Response): Promise<void> => {
  const count = await prisma.buyer.count();
  res.json({ success: true, data: { count } });
};

/** GET /api/admin/sellers/count — total seller count */
export const getSellerCount = async (_req: Request, res: Response): Promise<void> => {
  const count = await prisma.seller.count();
  res.json({ success: true, data: { count } });
};

/** GET /api/admin/orders/count — total order count */
export const getOrderCount = async (_req: Request, res: Response): Promise<void> => {
  const count = await prisma.order.count();
  res.json({ success: true, data: { count } });
};

/** GET /api/admin/products/count — total active product count */
export const getProductCount = async (_req: Request, res: Response): Promise<void> => {
  const count = await prisma.product.count({ where: { isActive: true } });
  res.json({ success: true, data: { count } });
};

/** GET /api/admin/sellers/pending-count — sellers with pending verification */
export const getPendingSellerCount = async (_req: Request, res: Response): Promise<void> => {
  const count = await prisma.sellerVerification.count({ where: { status: 'pending' } });
  res.json({ success: true, data: { count } });
};

/** GET /api/admin/orders/recent?limit=8 */
export const getRecentOrders = async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(50, parseInt(req.query.limit as string) || 8);
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalAmount: true,
      createdAt: true,
      buyer: { select: { firstName: true, lastName: true } },
    },
  });
  res.json({ success: true, data: orders });
};

/** GET /api/admin/sellers/pending?limit=5 */
export const getPendingSellers = async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(50, parseInt(req.query.limit as string) || 5);
  const verifications = await prisma.sellerVerification.findMany({
    where: { status: 'pending' },
    orderBy: { submittedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      submittedAt: true,
      seller: {
        select: {
          storeName: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
  });
  const data = verifications.map(v => ({
    id: v.id,
    storeName: v.seller.storeName,
    submittedAt: v.submittedAt,
    user: v.seller.user,
  }));
  res.json({ success: true, data });
};

/** GET /api/admin/notifications/recent?limit=8 */
export const getRecentNotifications = async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(50, parseInt(req.query.limit as string) || 8);
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      createdAt: true,
      read: true,
      actionUrl: true,
    },
  });
  res.json({ success: true, data: notifications });
};

/** GET /api/admin/users/unverified/count */
export const getUnverifiedCount = async (_req: Request, res: Response): Promise<void> => {
  const count = await prisma.user.count({ where: { emailVerified: false } });
  res.json({ success: true, data: { count } });
};

/** GET /api/admin/users?page&limit&role&search */
export const listUsers = async (req: Request, res: Response): Promise<void> => {
  const page   = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit  = Math.min(100, parseInt(req.query.limit as string) || 15);
  const skip   = (page - 1) * limit;
  const role   = (req.query.role   as string) || '';
  const search = (req.query.search as string) || '';

  const where: any = {};
  if (role === 'seller') where.seller = { isNot: null };
  if (role === 'buyer')  where.seller = { is: null };
  if (role === 'unverified') where.emailVerified = false;
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName:  { contains: search, mode: 'insensitive' } },
      { email:     { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        emailVerified: true,
        createdAt: true,
        seller: { select: { id: true, storeName: true, businessType: true, isActive: true } },
        _count: { select: { orders: true, wishlist: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ success: true, data: { users, total, pages: Math.ceil(total / limit), page } });
};

/** DELETE /api/admin/users/:id */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  await prisma.user.delete({ where: { id } });
  res.json({ success: true, message: 'User deleted' });
};

/** GET /api/admin/sellers/top?limit=6&sort=products */
export const getTopSellers = async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(20, parseInt(req.query.limit as string) || 6);
  const sellers = await prisma.seller.findMany({
    orderBy: { products: { _count: 'desc' } },
    take: limit,
    select: {
      id: true,
      storeName: true,
      category: true,
      _count: { select: { products: { where: { isActive: true } } } },
      user: { select: { firstName: true, lastName: true } },
    },
  });
  res.json({ success: true, data: sellers });
};

/** GET /api/admin/sellers/stats — seller verification stats */
export const getSellerStats = async (_req: Request, res: Response): Promise<void> => {
  const [total, pending, approved, rejected] = await Promise.all([
    prisma.seller.count(),
    prisma.sellerVerification.count({ where: { status: 'pending' } }),
    prisma.sellerVerification.count({ where: { status: 'approved' } }),
    prisma.sellerVerification.count({ where: { status: 'rejected' } }),
  ]);
  res.json({ success: true, data: { total, pending, approved, rejected } });
};

/** GET /api/admin/sellers?page&limit&status&search — paginated sellers for admin */
export const listSellers = async (req: Request, res: Response): Promise<void> => {
  const page   = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit  = Math.min(100, parseInt(req.query.limit as string) || 15);
  const skip   = (page - 1) * limit;
  const status = (req.query.status as string) || '';
  const search = (req.query.search as string) || '';

  const where: any = {};
  if (status && status !== 'all') {
    where.sellerVerification = { status };
  }
  if (search) {
    where.OR = [
      { storeName: { contains: search, mode: 'insensitive' } },
      { user: { firstName: { contains: search, mode: 'insensitive' } } },
      { user: { lastName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [sellers, total] = await Promise.all([
    prisma.seller.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        storeName: true,
        storeDescription: true,
        businessType: true,
        category: true,
        city: true,
        country: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, email: true, emailVerified: true, phone: true } },
        sellerVerification: { select: { status: true, submittedAt: true, reviewedAt: true, rejectionReason: true } },
        _count: { select: { products: true } },
      },
    }),
    prisma.seller.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      sellers,
      total,
      pages: Math.ceil(total / limit),
      page,
    },
  });
};

/** PATCH /api/admin/sellers/:id/verify — approve/reject seller */
export const verifySeller = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;

  const validStatuses = ['pending', 'approved', 'rejected'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ success: false, error: 'Invalid status' });
    return;
  }

  const seller = await prisma.seller.findUnique({ where: { id } });
  if (!seller) {
    res.status(404).json({ success: false, error: 'Seller not found' });
    return;
  }

  const verification = await prisma.sellerVerification.upsert({
    where: { sellerId: id },
    update: {
      status,
      reviewedAt: new Date(),
      rejectionReason: status === 'rejected' ? rejectionReason : null,
    },
    create: {
      sellerId: id,
      status,
      reviewedAt: new Date(),
      rejectionReason: status === 'rejected' ? rejectionReason : null,
    },
  });

  res.json({ success: true, message: `Seller ${status} successfully`, data: verification });
};

/** GET /api/orders/admin/stats — order statistics for admin */
export const getOrderStats = async (_req: Request, res: Response): Promise<void> => {
  const [total, pending, processing, shipped, delivered, cancelled] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: 'pending' } }),
    prisma.order.count({ where: { status: 'processing' } }),
    prisma.order.count({ where: { status: 'shipped' } }),
    prisma.order.count({ where: { status: 'delivered' } }),
    prisma.order.count({ where: { status: 'cancelled' } }),
  ]);

  const revenueRes = await prisma.order.aggregate({
    _sum: { totalAmount: true },
    where: { status: { in: ['processing', 'shipped', 'delivered'] } },
  });
  const revenue = revenueRes._sum.totalAmount?.toNumber() ?? 0;

  res.json({
    success: true,
    data: { total, pending, processing, shipped, delivered, cancelled, revenue },
  });
};

/** GET /api/orders/admin?page&limit&status&search — paginated orders for admin */
export const listOrders = async (req: Request, res: Response): Promise<void> => {
  const page   = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit  = Math.min(100, parseInt(req.query.limit as string) || 15);
  const skip   = (page - 1) * limit;
  const status = (req.query.status as string) || '';
  const search = (req.query.search as string) || '';

  const where: any = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { buyer: { firstName: { contains: search, mode: 'insensitive' } } },
      { buyer: { lastName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [orders, total] = await Promise.all([
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
        buyer: { select: { firstName: true, lastName: true, email: true } },
        seller: {
          select: {
            storeName: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        items: {
          select: {
            quantity: true,
            price: true,
            product: { select: { name: true, image: true } },
          },
        },
        address: {
          select: { street: true, city: true, state: true, zipCode: true },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      orders,
      total,
      pages: Math.ceil(total / limit),
      page,
    },
  });
};

/** GET /api/orders/admin/:id — single order detail for admin */
export const getAdminOrderDetail = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalAmount: true,
      paymentMethod: true,
      createdAt: true,
      buyer: { select: { firstName: true, lastName: true, email: true, phone: true } },
      seller: {
        select: {
          storeName: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
      items: {
        select: {
          quantity: true,
          price: true,
          product: { select: { name: true, image: true } },
        },
      },
      address: { select: { street: true, city: true, state: true, zipCode: true } },
    },
  });

  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  res.json({ success: true, data: order });
};

/** PATCH /api/orders/admin/:id/status — update order status */
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ success: false, error: 'Invalid status' });
    return;
  }

  const order = await prisma.order.findUnique({ where: { id } });

  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  await prisma.order.update({
    where: { id },
    data: { status },
  });

  if (!['pending', 'cancelled'].includes(status)) {
    const buyerUser = await prisma.user.findUnique({ where: { id: order.buyerId }, select: { email: true, firstName: true, lastName: true } });
    const seller = await prisma.seller.findUnique({ where: { id: order.sellerId }, select: { storeName: true } });
    if (buyerUser?.email) {
      void sendBuyerOrderStatusEmail(buyerUser.email, `${buyerUser.firstName} ${buyerUser.lastName}`.trim(), order.orderNumber, status, `${getVerificationBaseUrl()}/pages/buyer/orders/order-details.html?id=${order.id}`, seller?.storeName || 'Seller');
    }
  }

  res.json({ success: true, message: 'Order status updated' });
};

/** GET /api/admin/products/stats — product statistics */
export const getProductStats = async (_req: Request, res: Response): Promise<void> => {
  const [total, active, inactive, lowStock] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: false } }),
    prisma.product.count({ where: { stock: { lte: 5 }, isActive: true } }),
  ]);
  res.json({ success: true, data: { total, active, inactive, lowStock } });
};

/** GET /api/admin/products?page&limit&category&isActive&search — paginated products */
export const listProducts = async (req: Request, res: Response): Promise<void> => {
  const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit   = Math.min(100, parseInt(req.query.limit as string) || 15);
  const skip    = (page - 1) * limit;
  const category = (req.query.category as string) || '';
  const isActive = req.query.isActive;
  const search  = (req.query.search  as string) || '';

  const where: any = {};
  if (category) where.category = category;
  if (isActive !== '' && isActive !== undefined) where.isActive = isActive === 'true';
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        comparePrice: true,
        image: true,
        images: true,
        category: true,
        stock: true,
        rating: true,
        reviewCount: true,
        isActive: true,
        createdAt: true,
        seller: { select: { storeName: true, user: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      products,
      total,
      pages: Math.ceil(total / limit),
      page,
    },
  });
};

/** PATCH /api/admin/products/:id/toggle — toggle product active status */
export const toggleProduct = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { isActive } = req.body;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    res.status(404).json({ success: false, error: 'Product not found' });
    return;
  }

  await prisma.product.update({
    where: { id },
    data: { isActive },
  });

  res.json({ success: true, message: `Product ${isActive ? 'activated' : 'deactivated'}` });
};

/** DELETE /api/admin/products/:id — delete product */
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    res.status(404).json({ success: false, error: 'Product not found' });
    return;
  }

  await prisma.product.delete({ where: { id } });
  res.json({ success: true, message: 'Product deleted' });
};

/** PATCH /api/admin/profile — update admin profile */
export const updateAdminProfile = async (req: Request, res: Response): Promise<void> => {
  const { firstName, lastName, phone } = req.body;
  const userPayload = (req as any).admin;

  if (!userPayload || userPayload.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }

  const updateData: any = {};
  if (firstName !== undefined) updateData.firstName = firstName.trim();
  if (lastName !== undefined) updateData.lastName = lastName.trim();
  if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;

  const user = await prisma.user.update({
    where: { id: userPayload.userId },
    data: updateData,
    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
  });

  res.json({ success: true, data: user });
};

/** PATCH /api/admin/password — change admin password */
export const changeAdminPassword = async (req: Request, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  const userPayload = (req as any).admin;

  if (!userPayload || userPayload.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }

  const admin = await prisma.user.findUnique({
    where: { id: userPayload.userId },
    select: { id: true, password: true, email: true },
  });

  if (!admin) {
    res.status(404).json({ success: false, error: 'Admin not found' });
    return;
  }

  const isValid = await bcrypt.compare(currentPassword, admin.password);
  if (!isValid) {
    res.status(400).json({ success: false, error: 'Current password is incorrect' });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: admin.id },
    data: { password: newHash },
  });

  // Invalidate all existing sessions for this admin
  await prisma.session.deleteMany({
    where: { userId: admin.id },
  });

  res.json({ success: true, message: 'Password changed successfully' });
};

/** PATCH /api/admin/settings/maintenance — toggle maintenance mode */
export const toggleMaintenance = async (req: Request, res: Response): Promise<void> => {
  const { enabled } = req.body;
  // For now, just return success - actual implementation would update a settings table
  res.json({ success: true, message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}` });
};

/** GET /api/admin/notifications?limit&offset — admin notifications feed */
export const getAdminNotifications = async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
  const offset = parseInt(req.query.offset as string) || 0;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.notification.count(),
  ]);

  res.json({
    success: true,
    data: {
      notifications,
      total,
      hasMore: offset + limit < total,
    },
  });
};

/** GET /api/admin/notifications/unread-count */
export const getAdminUnreadCount = async (_req: Request, res: Response): Promise<void> => {
  const count = await prisma.notification.count({ where: { read: false } });
  res.json({ success: true, data: { count } });
};

/** PATCH /api/admin/notifications/:id/read */
export const markAdminNotificationRead = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  await prisma.notification.updateMany({
    where: { id, read: false },
    data: { read: true },
  });
  res.json({ success: true, message: 'Notification marked as read' });
};

/** PATCH /api/admin/notifications/read-all */
export const markAllAdminNotificationsRead = async (_req: Request, res: Response): Promise<void> => {
  await prisma.notification.updateMany({ where: { read: false }, data: { read: true } });
  res.json({ success: true, message: 'All notifications marked as read' });
};

/** DELETE /api/admin/notifications/:id */
export const deleteAdminNotification = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  await prisma.notification.delete({ where: { id } });
  res.json({ success: true, message: 'Notification deleted' });
};

/** DELETE /api/admin/notifications/clear-all */
export const clearAllAdminNotifications = async (_req: Request, res: Response): Promise<void> => {
  await prisma.notification.deleteMany({});
  res.json({ success: true, message: 'All notifications cleared' });
};

/* ═══════════════════════════════════════════
   2FA CONTROLLERS
   ═══════════════════════════════════════════ */
import * as speakeasy from 'speakeasy';
import QRCode from 'qrcode';

/** GET /api/admin/2fa/status */
export const getTwoFactorStatus = async (req: Request, res: Response): Promise<void> => {
  const admin = (req as any).admin as { userId: string };
  const user = await prisma.user.findUnique({
    where: { id: admin.userId },
    select: { twoFactorEnabled: true },
  });
  res.json({ success: true, data: { enabled: user?.twoFactorEnabled ?? false } });
};

/** POST /api/admin/2fa/setup */
export const setupTwoFactor = async (req: Request, res: Response): Promise<void> => {
  const admin = (req as any).admin as { userId: string };
  const secret = speakeasy.generateSecret({
    name: `UnimartX:${admin.userId}`,
    issuer: 'UnimartX',
  });

  const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
  await prisma.user.update({
    where: { id: admin.userId },
    data: { twoFactorSecret: secret.base32 },
  });

  res.json({ success: true, data: { secret: secret.base32, qrCode } });
};

/** POST /api/admin/2fa/confirm */
export const confirmTwoFactor = async (req: Request, res: Response): Promise<void> => {
  const admin = (req as any).admin as { userId: string };
  const { token, secret } = req.body as { token: string; secret: string };

  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1,
  });

  if (!verified) {
    res.status(400).json({ success: false, error: 'Invalid verification code' });
    return;
  }

  await prisma.user.update({
    where: { id: admin.userId },
    data: { twoFactorEnabled: true, twoFactorSecret: secret },
  });

  res.json({ success: true, message: '2FA enabled' });
};

/** POST /api/admin/2fa/disable */
export const disableTwoFactor = async (req: Request, res: Response): Promise<void> => {
  const admin = (req as any).admin as { userId: string };
  const { password } = req.body as { password: string };

  const user = await prisma.user.findUnique({ where: { id: admin.userId } });
  if (!user?.password) {
    res.status(400).json({ success: false, error: 'No password set' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ success: false, error: 'Incorrect password' });
    return;
  }

  await prisma.user.update({
    where: { id: admin.userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null as any, twoFactorBackupCodes: null as any },
  });

  res.json({ success: true, message: '2FA disabled' });
};

/** POST /api/admin/2fa/backup */
export const generateBackupCodes = async (req: Request, res: Response): Promise<void> => {
  const admin = (req as any).admin as { userId: string };
  const codes = Array.from({ length: 10 }, () =>
    Math.random().toString(36).substring(2, 10).toUpperCase()
  );
  await prisma.user.update({
    where: { id: admin.userId },
    data: { twoFactorBackupCodes: codes },
  });
  res.json({ success: true, data: { backupCodes: codes } });
};
