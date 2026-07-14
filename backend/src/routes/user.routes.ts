import { Router } from 'express';
import { changePassword, verifyPassword, getSessions, revokeSession, logoutAll, deleteAccount, exportUserData, getNotificationPreferences, updateNotificationPreferences } from '../controllers/user.controller';
import { validate } from '../middleware/validate';
import { changePasswordSchema, deleteAccountSchema, currentPasswordSchema, notificationPreferencesSchema } from '../schemas/user.schema';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

/**
 * @route   PATCH /api/users/password
 * @desc    Change user's password
 * @access  Private
 */
router.patch('/password', validate(changePasswordSchema), asyncHandler(changePassword));

/**
 * @route   POST /api/users/verify-password
 * @desc    Verify the current password matches the stored hash
 * @access  Private
 */
router.post('/verify-password', validate(currentPasswordSchema), asyncHandler(verifyPassword));

/**
 * @route   GET /api/users/sessions
 * @desc    Get all active sessions for current user
 * @access  Private
 */
router.get('/sessions', asyncHandler(getSessions));

/**
 * @route   DELETE /api/users/sessions/:sessionId
 * @desc    Revoke a specific session (log out from one device)
 * @access  Private
 */
router.delete('/sessions/:sessionId', asyncHandler(revokeSession));

/**
 * @route   POST /api/users/logout-all
 * @desc    Log out from all other devices except current session
 * @access  Private
 */
router.post('/logout-all', asyncHandler(logoutAll));

/**
 * @route   DELETE /api/users/account
 * @desc    Delete user account permanently
 * @access  Private
 */
router.delete('/account', validate(deleteAccountSchema), asyncHandler(deleteAccount));

/**
 * @route   GET /api/users/data-export
 * @desc    Export all user data (GDPR-style)
 * @access  Private
 */
router.get('/data-export', asyncHandler(exportUserData));

/**
 * @route   GET /api/users/notification-preferences
 * @desc    Get user's notification preferences
 * @access  Private
 */
router.get('/notification-preferences', asyncHandler(getNotificationPreferences));

/**
 * @route   PATCH /api/users/notification-preferences
 * @desc    Update user's notification preferences
 * @access  Private
 */
router.patch('/notification-preferences', validate(notificationPreferencesSchema), asyncHandler(updateNotificationPreferences));

export default router;
