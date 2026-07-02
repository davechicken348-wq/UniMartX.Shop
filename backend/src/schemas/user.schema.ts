import { z } from 'zod';

// Current password (required for sensitive operations)
export const currentPasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
});

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
});

// Delete account schema (requires password confirmation)
export const deleteAccountSchema = z.object({
  password: z
    .string()
    .min(1, 'Password is required'),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

// Notification preferences + privacy settings schema
export const notificationPreferencesSchema = z.object({
  orderUpdates: z.boolean().optional(),
  wishlistAlerts: z.boolean().optional(),
  promotions: z.boolean().optional(),
  accountActivity: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  orderHistoryVisibility: z.boolean().optional(),
  personalizedRecommendations: z.boolean().optional(),
  lowStockAlerts: z.boolean().optional(),
  paymentNotifications: z.boolean().optional(),
  reviewNotifications: z.boolean().optional(),
});

export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;
