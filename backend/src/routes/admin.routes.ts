import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';
import { registerAdminSchema } from '../schemas/auth.schema';
import { requireAdmin } from '../middleware/requireAdmin';
import {
  getUserCount,
  getSellerCount,
  getOrderCount,
  getProductCount,
  getPendingSellerCount,
  getRecentOrders,
  getPendingSellers,
  getRecentNotifications,
  getTopSellers,
  getUnverifiedCount,
  listUsers,
  deleteUser,
  getOrderStats,
  listOrders,
  getAdminOrderDetail,
  updateOrderStatus,
  getSellerStats,
  listSellers,
  verifySeller,
  getProductStats,
  listProducts,
  toggleProduct,
  deleteProduct,
  updateAdminProfile,
  changeAdminPassword,
  toggleMaintenance,
  getAdminNotifications,
  getAdminUnreadCount,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  deleteAdminNotification,
  clearAllAdminNotifications,
  registerAdmin,
  getTwoFactorStatus,
  setupTwoFactor,
  confirmTwoFactor,
  disableTwoFactor,
  generateBackupCodes,
} from '../controllers/admin.controller';
import {
  getAdminRefunds,
  getAdminRefundDetail,
  arbitrateRefund,
} from '../controllers/refund.controller';

const router = Router();

// Public admin registration (guarded by ADMIN_REGISTER_SECRET, not auth)
router.post('/register', validate(registerAdminSchema), asyncHandler(registerAdmin));

router.use(requireAdmin);

// KPI counts
router.get('/users/count',           asyncHandler(getUserCount));
router.get('/users/sellers/count',   asyncHandler(getSellerCount));
router.get('/sellers/count',        asyncHandler(getSellerCount));
router.get('/users/unverified/count',asyncHandler(getUnverifiedCount));
router.get('/orders/count',          asyncHandler(getOrderCount));
router.get('/products/count',        asyncHandler(getProductCount));
router.get('/sellers/pending-count', asyncHandler(getPendingSellerCount));

// User management
router.get('/users',                 asyncHandler(listUsers));
router.delete('/users/:id',          asyncHandler(deleteUser));

// Order management
router.get('/orders/stats',          asyncHandler(getOrderStats));
router.get('/orders',               asyncHandler(listOrders));
router.get('/orders/recent',         asyncHandler(getRecentOrders));
router.get('/orders/:id',           asyncHandler(getAdminOrderDetail));
router.patch('/orders/:id/status',   asyncHandler(updateOrderStatus));

// Seller verification
router.get('/sellers/stats',        asyncHandler(getSellerStats));
router.get('/sellers',              asyncHandler(listSellers));
router.patch('/sellers/:id/verify',  asyncHandler(verifySeller));

// Product management
router.get('/products/stats',        asyncHandler(getProductStats));
router.get('/products',             asyncHandler(listProducts));
router.patch('/products/:id/toggle', asyncHandler(toggleProduct));
router.delete('/products/:id',      asyncHandler(deleteProduct));

// Settings
router.patch('/profile',            asyncHandler(updateAdminProfile));
router.patch('/password',           asyncHandler(changeAdminPassword));
router.patch('/settings/maintenance', asyncHandler(toggleMaintenance));

// 2FA
router.get('/2fa/status',           asyncHandler(getTwoFactorStatus));
router.post('/2fa/setup',           asyncHandler(setupTwoFactor));
router.post('/2fa/confirm',         asyncHandler(confirmTwoFactor));
router.post('/2fa/disable',         asyncHandler(disableTwoFactor));
router.post('/2fa/backup',          asyncHandler(generateBackupCodes));

// Notifications
router.get('/notifications',           asyncHandler(getAdminNotifications));
router.get('/notifications/unread-count', asyncHandler(getAdminUnreadCount));
router.patch('/notifications/:id/read', asyncHandler(markAdminNotificationRead));
router.patch('/notifications/read-all', asyncHandler(markAllAdminNotificationsRead));
router.delete('/notifications/:id',   asyncHandler(deleteAdminNotification));
router.delete('/notifications/clear-all', asyncHandler(clearAllAdminNotifications));

// Lists
router.get('/sellers/pending',       asyncHandler(getPendingSellers));
router.get('/notifications/recent',  asyncHandler(getRecentNotifications));
router.get('/sellers/top',           asyncHandler(getTopSellers));

export default router;
