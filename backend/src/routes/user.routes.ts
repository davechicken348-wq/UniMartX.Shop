import { Router } from 'express';
import { changePassword, verifyPassword, getSessions, revokeSession, logoutAll, deleteAccount, exportUserData, getNotificationPreferences, updateNotificationPreferences } from '../controllers/user.controller';
import { validate } from '../middleware/validate';
import { changePasswordSchema, deleteAccountSchema, currentPasswordSchema, notificationPreferencesSchema } from '../schemas/user.schema';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../controllers/auth.controller';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

const passwordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: 'Too many password attempts, please try again later.' });


router.patch('/password', passwordLimiter, validate(changePasswordSchema), asyncHandler(changePassword));
router.post('/verify-password', passwordLimiter, validate(currentPasswordSchema), asyncHandler(verifyPassword));
router.get('/sessions', asyncHandler(getSessions));
router.delete('/sessions/:sessionId', asyncHandler(revokeSession));
router.post('/logout-all', asyncHandler(logoutAll));
router.delete('/account', validate(deleteAccountSchema), asyncHandler(deleteAccount));
router.get('/data-export', asyncHandler(exportUserData));
router.get('/notification-preferences', asyncHandler(getNotificationPreferences));
router.patch('/notification-preferences', validate(notificationPreferencesSchema), asyncHandler(updateNotificationPreferences));

export default router;
