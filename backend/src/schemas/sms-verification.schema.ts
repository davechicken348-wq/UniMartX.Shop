import { z } from 'zod';

export const sendSmsCodeSchema = z.object({
  phone: z
    .string()
    .min(7, 'Phone number is too short')
    .max(20, 'Phone number is too long')
    .regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number format'),
});

export const verifySmsCodeSchema = z.object({
  code: z
    .string()
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only numbers'),
});

export const resendSmsCodeSchema = z.object({
  phone: z
    .string()
    .min(7, 'Phone number is too short')
    .max(20, 'Phone number is too long')
    .regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number format'),
});
