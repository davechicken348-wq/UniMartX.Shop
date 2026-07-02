import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { changePasswordSchema, deleteAccountSchema } from '../schemas/user.schema';
import { authenticate, type JwtPayload } from '../controllers/auth.controller';
import { notificationPreferencesSchema, type NotificationPreferencesInput } from '../schemas/user.schema';

/**
 * PATCH /api/users/password
 * Change user's password
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    // Fetch current user with password
    const user = await prisma.user.findUnique({
      where: { id: userPayload.userId },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and invalidate all sessions except current
    const { sessionId } = userPayload;
    await prisma.$transaction(async (tx) => {
      // Update user password
      await tx.user.update({
        where: { id: userPayload.userId },
        data: { password: hashedNewPassword },
      });

      // Delete all sessions for this user EXCEPT the current one (if tracked)
      if (sessionId) {
        await tx.session.deleteMany({
          where: {
            userId: userPayload.userId,
            sessionId: { not: sessionId },
          },
        });
      } else {
        // Legacy token: no session tracking, skip deletion
      }
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError('Invalid input data', 400);
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to change password', 500);
  }
};

/**
 * GET /api/users/sessions
 * Get all active sessions for the current user
 */
export const getSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const sessions = await prisma.session.findMany({
      where: { userId: userPayload.userId },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        sessionId: true,
        deviceInfo: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastActiveAt: true,
        expiresAt: true,
      },
    });

    // Parse user agent strings to get browser/device info (basic parsing)
    const parsedSessions = sessions.map((session) => {
      let browser = 'Unknown Browser';
      let os = 'Unknown OS';
      let deviceType = 'desktop';

      if (session.userAgent) {
        const ua = session.userAgent.toLowerCase();

        // Simple browser detection
        if (ua.includes('chrome')) browser = 'Chrome';
        else if (ua.includes('firefox')) browser = 'Firefox';
        else if (ua.includes('safari')) browser = 'Safari';
        else if (ua.includes('edge')) browser = 'Edge';

        // Simple OS detection
        if (ua.includes('windows')) os = 'Windows';
        else if (ua.includes('mac os')) os = 'macOS';
        else if (ua.includes('linux')) os = 'Linux';
        else if (ua.includes('android')) {
          os = 'Android';
          deviceType = 'mobile';
        } else if (ua.includes('iphone') || ua.includes('ipad')) {
          os = 'iOS';
          deviceType = 'mobile';
        }

        // Mobile detection
        if (ua.includes('mobile')) deviceType = 'mobile';
      }

      return {
        id: session.id,
        sessionId: session.sessionId,
        isCurrent: session.sessionId === userPayload.sessionId,
        browser,
        os,
        deviceType,
        ipAddress: session.ipAddress || 'Unknown',
        deviceInfo: session.deviceInfo || `${browser} on ${os}`,
        lastActiveAt: session.lastActiveAt,
        expiresAt: session.expiresAt,
      };
    });

    res.status(200).json({
      success: true,
      data: parsedSessions,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch sessions', 500);
  }
};

/**
 * DELETE /api/users/sessions/:sessionId
 * Revoke a specific session
 */
export const revokeSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const { sessionId } = req.params;

    // Ensure session belongs to the authenticated user
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: userPayload.userId,
      },
    });

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    // Don't allow revoking the current session (use logout endpoint instead)
    if (session.sessionId === userPayload.sessionId) {
      throw new AppError('Cannot revoke your current session. Use logout to sign out.', 400);
    }

    // Delete the session
    await prisma.session.delete({
      where: { id: sessionId },
    });

    res.status(200).json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to revoke session', 500);
  }
};

/**
 * POST /api/users/logout-all
 * Log out from all other devices except current session
 */
export const logoutAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const { sessionId } = userPayload;
    let loggedOutCount = 0;

    if (sessionId) {
      // Delete all sessions except the current one
      const result = await prisma.session.deleteMany({
        where: {
          userId: userPayload.userId,
          sessionId: { not: sessionId },
        },
      });
      loggedOutCount = result.count;
    }
    // If sessionId is undefined (legacy token), cannot identify current session => do nothing

    res.status(200).json({
      success: true,
      message: `Logged out from ${loggedOutCount} other device(s)`,
      data: { loggedOutCount },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to log out from other devices', 500);
  }
};

/**
 * DELETE /api/users/account
 * Permanently delete user account
 */
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const { password } = deleteAccountSchema.parse(req.body);

    // Fetch user with password
    const user = await prisma.user.findUnique({
      where: { id: userPayload.userId },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Incorrect password', 400);
    }

    // Delete all sessions for this user
    await prisma.session.deleteMany({
      where: { userId: userPayload.userId },
    });

    // Delete user (cascading deletes will handle related data)
    await prisma.user.delete({
      where: { id: userPayload.userId },
    });

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError('Invalid input data', 400);
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to delete account', 500);
   }
 };

/**
 * GET /api/users/data-export
 * Export all user data (GDPR-style data portability)
 */
export const exportUserData = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const userId = userPayload.userId;

    // Fetch all user-related data in parallel
    const [user, buyer, cart, sessions, notifications, preferences, orders, wishlists, reviews] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.buyer.findUnique({
        where: { userId },
        select: { id: true, preferredName: true, createdAt: true, updatedAt: true },
      }),
      prisma.cart.findUnique({
        where: { userId },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          items: {
            select: {
              id: true,
              quantity: true,
              createdAt: true,
              product: { select: { id: true, name: true, price: true } },
            },
          },
        },
      }),
      prisma.session.findMany({
        where: { userId },
        select: { id: true, sessionId: true, deviceInfo: true, ipAddress: true, userAgent: true, createdAt: true, lastActiveAt: true, expiresAt: true },
        orderBy: { lastActiveAt: 'desc' },
      }),
      prisma.notification.findMany({
        where: { userId },
        select: { id: true, type: true, title: true, message: true, read: true, createdAt: true, actionUrl: true, icon: true, priority: true },
        orderBy: { createdAt: 'desc' },
        take: 100, // Limit to last 100 for reasonable file size
      }),
      prisma.notificationPreference.findUnique({
        where: { userId },
        select: { id: true, orderUpdates: true, wishlistAlerts: true, promotions: true, accountActivity: true, emailNotifications: true, orderHistoryVisibility: true, personalizedRecommendations: true, createdAt: true, updatedAt: true },
      }),
      prisma.order.findMany({
        where: { buyerId: userId },
        select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true, updatedAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.wishlist.findMany({
        where: { userId },
        select: { id: true, createdAt: true, product: { select: { id: true, name: true, price: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.findMany({
        where: { userId },
        select: { id: true, rating: true, comment: true, createdAt: true, product: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    // Compile export
    const exportData = {
      exportedAt: new Date().toISOString(),
      user,
      buyer,
      cart: cart ? { id: cart.id, items: cart.items, createdAt: cart.createdAt, updatedAt: cart.updatedAt } : null,
      sessions: sessions.map(s => ({
        id: s.id,
        deviceInfo: s.deviceInfo,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        lastActiveAt: s.lastActiveAt,
        expiresAt: s.expiresAt,
      })),
      notifications,
      preferences,
      orders,
      wishlists,
      reviews,
    };

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="unimartx-data-export-${new Date().toISOString().split('T')[0]}.json"`);

    res.status(200).json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to export user data', 500);
  }
};

/**
 * GET /api/users/notification-preferences
 * Get user's notification preferences
 */
export const getNotificationPreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId: userPayload.userId },
    });

    // If no preferences exist yet, return defaults
    if (!prefs) {
      const defaultPrefs = {
        orderUpdates: true,
        wishlistAlerts: true,
        promotions: true,
        accountActivity: true,
        emailNotifications: true,
orderHistoryVisibility: true,
  personalizedRecommendations: true,
  lowStockAlerts: true,
  paymentNotifications: true,
      };

      // Create default preferences for the user
      await prisma.notificationPreference.create({
        data: {
          userId: userPayload.userId,
          ...defaultPrefs,
        },
      });

      res.status(200).json({
        success: true,
        data: defaultPrefs,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        orderUpdates: prefs.orderUpdates,
        wishlistAlerts: prefs.wishlistAlerts,
        promotions: prefs.promotions,
        accountActivity: prefs.accountActivity,
        emailNotifications: prefs.emailNotifications,
        orderHistoryVisibility: prefs.orderHistoryVisibility,
        personalizedRecommendations: prefs.personalizedRecommendations,
        lowStockAlerts: prefs.lowStockAlerts,
        paymentNotifications: prefs.paymentNotifications,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch notification preferences', 500);
  }
};

/**
 * PATCH /api/users/notification-preferences
 * Update user's notification preferences
 */
export const updateNotificationPreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const input = notificationPreferencesSchema.parse(req.body);

    // Upsert: update if exists, create if doesn't
    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: userPayload.userId },
      update: input,
      create: {
        userId: userPayload.userId,
        ...input,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: {
        orderUpdates: prefs.orderUpdates,
        wishlistAlerts: prefs.wishlistAlerts,
        promotions: prefs.promotions,
        accountActivity: prefs.accountActivity,
        emailNotifications: prefs.emailNotifications,
        orderHistoryVisibility: prefs.orderHistoryVisibility,
        personalizedRecommendations: prefs.personalizedRecommendations,
        lowStockAlerts: prefs.lowStockAlerts,
        paymentNotifications: prefs.paymentNotifications,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError('Invalid input data', 400);
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to update notification preferences', 500);
  }
};
