import { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { NotificationService } from '../services/notification.service';
import { authenticate, type JwtPayload } from '../controllers/auth.controller';

// Validation schemas
export const notificationQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
  read: z.union([z.literal('true'), z.literal('false')]).optional().transform(val =>
    val === undefined ? undefined : val === 'true'
  ),
});

export type NotificationQuery = {
  limit?: number;
  offset?: number;
  read?: boolean;
};

/**
 * GET /api/notifications
 * Get user's notifications with pagination
 * Query params: ?limit=20&offset=0&read=false
 */
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const query = notificationQuerySchema.parse(req.query);
    const { notifications, total } = await NotificationService.getUserNotifications(userPayload.userId, query);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        total,
        hasMore: (query.offset || 0) + notifications.length < total,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError('Invalid query parameters', 400);
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch notifications', 500);
  }
};

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const count = await NotificationService.getUnreadCount(userPayload.userId);

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to get unread count', 500);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read
 */
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const { id } = req.params;

    await NotificationService.markAsRead(userPayload.userId, id);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to mark notification as read', 500);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    await NotificationService.markAllAsRead(userPayload.userId);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to mark all notifications as read', 500);
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const { id } = req.params;

    await NotificationService.delete(userPayload.userId, id);

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to delete notification', 500);
  }
};

/**
 * DELETE /api/notifications/clear-all
 * Clear all notifications for the user
 */
export const clearAllNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    await NotificationService.clearAll(userPayload.userId);

    res.status(200).json({
      success: true,
      message: 'All notifications cleared',
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to clear notifications', 500);
  }
};
