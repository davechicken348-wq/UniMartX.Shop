import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} from '../controllers/notification.controller';
import { validate } from '../middleware/validate';
import { notificationQuerySchema } from '../controllers/notification.controller';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

/**
 * @route   GET /api/notifications
 * @desc    Get user's notifications with pagination
 * @access  Private
 * @query  ?limit=20&offset=0&read=false
 */
router.get('/', validate(notificationQuerySchema), asyncHandler(getNotifications));

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications
 * @access  Private
 */
router.get('/unread-count', asyncHandler(getUnreadCount));

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private
 */
router.patch('/read-all', asyncHandler(markAllAsRead));
router.patch('/:id/read', asyncHandler(markAsRead));

router.delete('/clear-all', asyncHandler(clearAllNotifications));
router.delete('/:id', asyncHandler(deleteNotification));

export default router;
