import { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { sendSmsVerificationCode, verifySmsCode, resendSmsVerificationCode } from '../services/sms.service';

const sendSmsCodeSchema = z.object({
  phone: z.string().min(7, 'Invalid phone number').max(20, 'Phone number is too long'),
});

const verifySmsCodeSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

const resendSmsCodeSchema = z.object({
  phone: z.string().min(7, 'Invalid phone number').max(20, 'Phone number is too long'),
});

export const sendSmsCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = sendSmsCodeSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: { phone },
    });

    if (!user) {
      res.status(200).json({
        success: true,
        message: 'If a verified account exists with this phone number, a verification code has been sent.',
      });
      return;
    }

    if (user.smsVerified) {
      res.status(200).json({
        success: true,
        message: 'Phone number is already verified.',
      });
      return;
    }

    const result = await sendSmsVerificationCode(phone, user.id);

    if (!result.success) {
      throw new AppError(result.error || 'Failed to send verification code', 500);
    }

    res.status(200).json({
      success: true,
      message: 'Verification code sent successfully.',
      expiresIn: '10 minutes',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new AppError('Invalid input', 400);
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to send verification code', 500);
  }
};

export const verifySms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = verifySmsCodeSchema.parse(req.body);
    const user = (req as any).user;

    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const isValid = await verifySmsCode(user.userId, code);

    if (!isValid) {
      throw new AppError('Invalid or expired verification code', 400);
    }

    res.status(200).json({
      success: true,
      message: 'Phone number verified successfully!',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError('Invalid input', 400);
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to verify code', 500);
  }
};

export const resendSmsCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = resendSmsCodeSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: { phone },
    });

    if (!user) {
      res.status(200).json({
        success: true,
        message: 'If an account exists with this phone number, a verification code has been sent.',
      });
      return;
    }

    if (user.smsVerified) {
      res.status(200).json({
        success: true,
        message: 'Phone number is already verified.',
      });
      return;
    }

    const result = await resendSmsVerificationCode(phone, user.id);

    if (!result.success) {
      throw new AppError(result.error || 'Failed to resend verification code', 500);
    }

    res.status(200).json({
      success: true,
      message: 'Verification code resent successfully.',
      expiresIn: '10 minutes',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError('Invalid input', 400);
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to resend verification code', 500);
  }
};
