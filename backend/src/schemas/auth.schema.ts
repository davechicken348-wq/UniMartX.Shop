import { z } from 'zod';

// Password strength requirements
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(100, 'Email is too long')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export const registerBuyerSchema = z.object({
  name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  email: z
    .string()
    .email('Invalid email address')
    .max(100, 'Email is too long')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordRegex, 'Password must contain uppercase, lowercase, number, and special character (@$!%*?&).'),
});

export const registerSellerSchema = z.object({
  // Account info
  name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  email: z
    .string()
    .email('Invalid email address')
    .max(100, 'Email is too long')
    .toLowerCase()
    .trim(),
  phone: z
    .string()
    .min(7, 'Phone number must be at least 7 digits')
    .max(20, 'Phone number is too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordRegex, 'Password must contain uppercase, lowercase, number, and special character (@$!%*?&).'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const sellerTypeSchema = z.object({
  sellerType: z.enum(['campus', 'independent']),
  university: z.string().optional(),
  studentId: z.string().optional(),
  businessType: z.enum(['individual', 'small-business']).optional(),
  currentPlatform: z.enum(['whatsapp', 'instagram', 'facebook', 'physical', 'other', 'none']).optional(),
});

export const storeInfoSchema = z.object({
  storeName: z
    .string()
    .min(2, 'Store name must be at least 2 characters')
    .max(100, 'Store name is too long'),
  category: z.enum([
    'electronics',
    'fashion',
    'home',
    'beauty',
    'sports',
    'books',
    'food',
    'services',
    'other',
  ]),
  storeDescription: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(300, 'Description must be less than 300 characters'),
  country: z
    .string()
    .min(2, 'Please enter a valid country name'),
  city: z
    .string()
    .min(2, 'Please enter a valid city name'),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(100, 'Email is too long')
    .toLowerCase()
    .trim(),
});

export const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordRegex, 'Password must contain uppercase, lowercase, number, and special character (@$!%*?&).'),
});

export const registerAdminSchema = z.object({
  adminSecret: z
    .string()
    .min(1, 'Setup secret is required'),
  email: z
    .string()
    .email('Invalid email address')
    .max(100, 'Email is too long')
    .toLowerCase()
    .trim(),
  firstName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordRegex, 'Password must contain uppercase, lowercase, number, and special character (@$!%*?&).'),
});

export type RegisterBuyerInput = z.infer<typeof registerBuyerSchema>;
export type RegisterSellerInput = z.infer<typeof registerSellerSchema>;
export type SellerTypeInput = z.infer<typeof sellerTypeSchema>;
export type StoreInfoInput = z.infer<typeof storeInfoSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RegisterAdminInput = z.infer<typeof registerAdminSchema>;
