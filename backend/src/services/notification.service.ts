import { PrismaClient, type NotificationPreference, type NotificationType, type NotificationPriority } from '@prisma/client';

const prisma = new PrismaClient();

type NotificationPrefs = {
  orderUpdates: boolean;
  wishlistAlerts: boolean;
  promotions: boolean;
  accountActivity: boolean;
  emailNotifications: boolean;
  reviewNotifications: boolean;
  followAlerts: boolean;
};

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  orderId?: string;
  productId?: string;
  actionUrl?: string;
  icon?: string;
  priority?: NotificationPriority;
  metadata?: Record<string, any>;
};

export class NotificationService {
  /**
   * Map notification types to the corresponding user preference key
   * Returns null for types that have no preference (always delivered)
   */
  private static preferenceKeyForType(type: NotificationType): keyof NotificationPrefs | null {
    // Order updates: order_placed, order_confirmed, order_preparing, order_shipped, order_delivered, order_cancelled, order_refunded
    if (type.startsWith('order_')) return 'orderUpdates';
    // Wishlist alerts: wishlist_price_drop, wishlist_back_in_stock, product_wishlisted
    if (type.startsWith('wishlist_') || type === 'product_wishlisted') return 'wishlistAlerts';
    // Promotions
    if (type === 'promotion') return 'promotions';
    // Account activity: login_alert, password_changed, email_verified
    if (type === 'login_alert' || type === 'password_changed' || type === 'email_verified') {
      return 'accountActivity';
    }
    if (type === 'new_review' || type === 'review_reply') return 'reviewNotifications';
    // Types without explicit preference: welcome, announcement, new_order_seller, low_stock_alert
    return null;
  }

  /**
   * Get user's notification preferences (defaults to all true if no record)
   * Creates default record if one doesn't exist.
   */
  private static async getUserPreferences(userId: string): Promise<NotificationPrefs> {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    const defaults: NotificationPrefs = {
      orderUpdates: true,
      wishlistAlerts: true,
      promotions: true,
      accountActivity: true,
      emailNotifications: true,
      reviewNotifications: true,
      followAlerts: true,
    };

    if (!prefs) {
      // Create default preferences for the user automatically
      await prisma.notificationPreference.create({
        data: { userId, ...defaults },
      });
      return defaults;
    }

    return {
      orderUpdates: prefs.orderUpdates,
      wishlistAlerts: prefs.wishlistAlerts,
      promotions: prefs.promotions,
      accountActivity: prefs.accountActivity,
      emailNotifications: prefs.emailNotifications,
      reviewNotifications: (prefs as any).reviewNotifications ?? true,
      followAlerts: prefs.followAlerts,
    };
  }

  /**
   * Check if a notification type is allowed by user preferences
   */
  private static async isNotificationAllowed(userId: string, type: NotificationType): Promise<boolean> {
    const prefKey = this.preferenceKeyForType(type);
    if (prefKey === null) return true; // No preference mapping = always allowed

    const prefs = await this.getUserPreferences(userId);
    return !!prefs[prefKey];
  }

  /**
   * Check if user wants email notifications (global email gate)
   */
  public static async shouldSendEmail(userId: string): Promise<boolean> {
    const prefs = await this.getUserPreferences(userId);
    return prefs.emailNotifications;
  }

  /**
   * Check if user wants review notifications specifically
   */
  public static async shouldSendReviewNotification(userId: string): Promise<{ inApp: boolean; email: boolean }> {
    const prefs = await this.getUserPreferences(userId);
    return {
      inApp: prefs.reviewNotifications,
      email: prefs.reviewNotifications && prefs.emailNotifications,
    };
  }

  /**
   * Create a new notification for a user (respects preferences)
   */
  static async create(input: CreateNotificationInput): Promise<void> {
    const { userId, type } = input;

    // Check if user allows this notification type
    const allowed = await this.isNotificationAllowed(userId, type);
    if (!allowed) {
      console.log(`[NotificationService] Blocked notification '${type}' for user ${userId} due to preferences`);
      return;
    }

    await prisma.notification.create({
      data: {
        userId,
        type,
        title: input.title,
        message: input.message,
        orderId: input.orderId,
        productId: input.productId,
        actionUrl: input.actionUrl,
        icon: input.icon,
        priority: input.priority || 'normal',
        metadata: input.metadata,
      },
    });
  }

  /**
   * Create notifications for multiple users (respects preferences)
   */
  static async createMany(userIds: string[], input: Omit<CreateNotificationInput, 'userId'>): Promise<void> {
    const { type } = input;
    const prefKey = this.preferenceKeyForType(type);

    let targetUserIds: string[];

    if (prefKey === null) {
      // No preference check needed — all users allowed
      targetUserIds = userIds;
    } else {
      // Users with explicit preference set to true
      const enabledPrefs = await prisma.notificationPreference.findMany({
        where: {
          userId: { in: userIds },
          [prefKey]: true,
        },
        select: { userId: true },
      });
      const enabledSet = new Set(enabledPrefs.map(p => p.userId));

      // Users without any preference record (defaults to all true)
      const usersWithoutPrefs = await prisma.user.findMany({
        where: {
          id: { in: userIds },
          notificationPreference: null,
        },
        select: { id: true },
      });
      const withoutPrefsIds = usersWithoutPrefs.map(u => u.id);

      targetUserIds = [...enabledSet, ...withoutPrefsIds];
    }

    if (targetUserIds.length === 0) {
      console.log(`[NotificationService] createMany blocked for type '${type}': no users allowed by preferences`);
      return;
    }

    // Insert in batches to avoid query size limits
    const batchSize = 100;
    for (let i = 0; i < targetUserIds.length; i += batchSize) {
      const batch = targetUserIds.slice(i, i + batchSize).map(userId => ({
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        orderId: input.orderId,
        productId: input.productId,
        actionUrl: input.actionUrl,
        icon: input.icon,
        priority: input.priority || 'normal',
        metadata: input.metadata,
      }));
      await prisma.notification.createMany({ data: batch });
    }
  }

  /**
   * Get notifications for a user with pagination and read status filter
   */
  static async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      read?: boolean;
      type?: NotificationType;
    } = {}
  ): Promise<{
    notifications: Array<{
      id: string;
      type: NotificationType;
      title: string;
      message: string;
      read: boolean;
      createdAt: Date;
      actionUrl: string | null;
      icon: string | null;
      priority: NotificationPriority;
      metadata: any;
      orderId: string | null;
      productId: string | null;
    }>;
    total: number;
  }> {
    const { limit = 20, offset = 0, read, type } = options;

    const where: any = { userId };
    if (read !== undefined) where.read = read;
    if (type) where.type = type;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      total,
    };
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, read: false },
    });
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(userId: string, notificationId: string): Promise<void> {
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });

    if (result.count === 0) {
      throw new Error('Notification not found or does not belong to user');
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  /**
   * Delete a notification
   */
  static async delete(userId: string, notificationId: string): Promise<void> {
    const result = await prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });

    if (result.count === 0) {
      throw new Error('Notification not found or does not belong to user');
    }
  }

  /**
   * Clear all notifications for a user
   */
  static async clearAll(userId: string): Promise<void> {
    await prisma.notification.deleteMany({
      where: { userId },
    });
  }

  /**
   * Delete old read notifications (for cleanup)
   */
  static async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const result = await prisma.notification.deleteMany({
      where: {
        read: true,
        createdAt: { lte: cutoff },
      },
    });

    return result.count;
  }
}
