import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { z, type ZodIssue } from 'zod';
import {
  registerSellerSchema,
  sellerTypeSchema,
  storeInfoSchema,
  type RegisterSellerInput,
  type SellerTypeInput,
  type StoreInfoInput,
} from '../schemas/auth.schema';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { generateToken, getTokenExpiry } from '../utils/token';
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  getBackendBaseUrl,
} from '../services/email.service';

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'buyer' | 'seller' | 'admin';
  sessionId: string;
}

/**
 * POST /api/seller-auth/register
 * Register a new seller account with store information
 */
export const registerSeller = async (req: Request, res: Response): Promise<void> => {
  try {
    // Parse and validate all data
    const accountData = registerSellerSchema.parse(req.body);
    const typeData = sellerTypeSchema.parse(req.body);
    const storeData = storeInfoSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: accountData.email },
    });

    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(accountData.password, 10);

    // Split name into first and last
    const nameParts = accountData.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // Determine business type and university affiliation based on seller type
    let businessType = '';
    let universityAffiliation: string | null = null;

    if (typeData.sellerType === 'campus') {
      businessType = 'campus_seller';
      universityAffiliation = typeData.university || null;
    } else if (typeData.sellerType === 'independent') {
      businessType = typeData.businessType || 'individual';
      universityAffiliation = null;
    }

    // Create user and seller profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: accountData.email,
          password: hashedPassword,
          firstName: firstName,
          lastName: lastName,
          phone: accountData.phone,
          role: 'seller',
        },
      });

      const seller = await tx.seller.create({
        data: {
          userId: user.id,
          storeName: storeData.storeName,
          storeDescription: storeData.storeDescription,
          category: storeData.category,
          country: storeData.country,
          city: storeData.city,
          businessType: businessType,
          universityAffiliation: universityAffiliation,
        },
      });

      // Create default notification preferences for the seller
      await tx.notificationPreference.create({
        data: {
          userId: user.id,
          orderUpdates: true,
          wishlistAlerts: true,
          promotions: true,
          accountActivity: true,
          emailNotifications: true,
        },
      });

      // Create initial seller verification record (pending admin approval)
      await tx.sellerVerification.create({
        data: {
          sellerId: seller.id,
          status: 'pending',
        },
      });

      // Generate and store verification token
      const verificationToken = generateToken(32);
      const tokenExpiresAt = getTokenExpiry();

      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: verificationToken,
          expiresAt: tokenExpiresAt,
        },
      });

      // Generate JWT token with sessionId
      const sessionId = randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days for new registrations

      // Create session record
      await tx.session.create({
        data: {
          userId: user.id,
          sessionId,
          deviceInfo: req.headers['user-agent'] || null,
          ipAddress: (req as any).ip || (req as any).headers['x-forwarded-for']?.split(',')[0]?.trim() || null,
          userAgent: req.headers['user-agent'] || null,
          expiresAt,
          lastActiveAt: new Date(),
        },
      });

      // Create welcome notification for the new seller
      await tx.notification.create({
        data: {
          userId: user.id,
          type: 'welcome',
          title: 'Welcome to UnimartX!',
          message: `Hi ${firstName}, thank you for joining UnimartX as a seller! Set up your store and start selling today.`,
          actionUrl: '/pages/seller/private/dashboard/overview.html',
          icon: 'store',
          priority: 'normal',
        },
      });

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: 'seller', sessionId } as JwtPayload,
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      // Send verification email asynchronously
      const verificationUrl = `${getBackendBaseUrl()}/api/auth/verify-redirect/${verificationToken}`;
      sendVerificationEmail(user.email, firstName, verificationUrl).catch((err) => {
        console.error('Failed to send verification email (non-blocking):', err);
      });

      // Send welcome email asynchronously
      sendWelcomeEmail(user.email, firstName).catch((err) => {
        console.error('Failed to send welcome email (non-blocking):', err);
      });

      return { user, token };
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: 'seller',
        },
        token: result.token,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      throw new AppError('Invalid input data: ' + error.issues.map((e: ZodIssue) => e.message).join(', '), 400);
    }
    throw new AppError('Failed to create seller account', 500);
  }
};
