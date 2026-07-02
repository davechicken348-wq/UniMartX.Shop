import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { registerBuyerSchema, type RegisterBuyerInput, loginSchema, type LoginInput, forgotPasswordSchema, type ForgotPasswordInput, resetPasswordSchema, type ResetPasswordInput } from '../schemas/auth.schema';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { generateToken, getTokenExpiry } from '../utils/token';
import { sendVerificationEmail, sendWelcomeEmail, getVerificationBaseUrl, getBackendBaseUrl, sendPasswordResetEmail, sendPasswordChangedEmail } from '../services/email.service';
import { NotificationService } from '../services/notification.service';
import { redirectVerification } from './verification.controller';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
function absUrl(path: string | null | undefined): string | null {
  const p = path || '';
  if (!p) return null;
  // Reject directory paths to avoid serving HTML index files as images
  if (p.endsWith('/')) return null;
  // Encode relative /uploads/* paths as proper absolute URLs
  if (p.startsWith('/uploads')) {
    try {
      return new URL(p, BACKEND_URL).href;
    } catch {
      return `${BACKEND_URL}${p}`;
    }
  }
  if (/^https?:/.test(p) || p.startsWith('data:') || p.startsWith('blob:')) return p;
  return `${BACKEND_URL}${p}`;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'buyer' | 'seller' | 'admin';
  sessionId: string;
}

  /**
    * Authenticate user (JWT) from Authorization header
    * Returns payload or null if token invalid/expired (no error thrown)
    */
  export function authenticate(req: Request): JwtPayload | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      return decoded;
    } catch {
      return null;
    }
  }

/**
 * POST /api/auth/register/buyer
 */
export const registerBuyer = async (req: Request, res: Response): Promise<void> => {
  try {
    const input = registerBuyerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, 10);

    // Split name into first and last
    const nameParts = input.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // Create user and buyer profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          firstName: firstName,
          lastName: lastName,
        },
      });

      await tx.buyer.create({
        data: {
          userId: user.id,
          preferredName: firstName,
        },
      });

       // Create empty cart for the buyer
       await tx.cart.create({
         data: {
           userId: user.id,
         },
       });

       // Create default notification preferences for the buyer
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

        // Create welcome notification for the new buyer
        await tx.notification.create({
          data: {
            userId: user.id,
            type: 'welcome',
            title: 'Welcome to UnimartX!',
            message: `Hi ${firstName}, thank you for joining UnimartX! Start exploring products from sellers across campus.`,
            actionUrl: '/pages/buyer/buyer-landing/buyer-landing.html',
            icon: 'gift',
            priority: 'normal',
          },
        });

        const token = jwt.sign(
         { userId: user.id, email: user.email, role: 'buyer', sessionId } as JwtPayload,
         process.env.JWT_SECRET!,
         { expiresIn: '7d' }
       );

        // Send welcome email first, then verification email (non-blocking)
        sendWelcomeEmail(user.email, firstName).catch((err) => {
          console.error('Failed to send welcome email (non-blocking):', err);
        });

        const verificationUrl = `${getBackendBaseUrl()}/api/auth/verify-redirect/${verificationToken}`;
        sendVerificationEmail(user.email, firstName, verificationUrl).catch((err) => {
          console.error('Failed to send verification email (non-blocking):', err);
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
            role: 'buyer',
          },
          token: result.token,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
       if (error instanceof z.ZodError) {
         throw new AppError('Invalid input data', 400);
     }
   }
 }


/**
 * POST /api/auth/login
 * Authenticate user and return JWT token with role
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        buyer: true,
        seller: true,
      },
    });

    if (!user) {
      throw new AppError('No account found with this email', 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Incorrect password', 401);
    }

    // Check email verification (skip in development for testing)
    if (!user.emailVerified && process.env.NODE_ENV === 'production') {
      throw new AppError('Please verify your email before logging in', 403);
    }

    let role = user.role;

    // Generate a unique session ID
    const sessionId = randomUUID();

    // Calculate session expiry (30 days from now, matches JWT expiry)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create session record
    await prisma.session.create({
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

    // Generate JWT token with sessionId
    const token = jwt.sign(
      { userId: user.id, email: user.email, role, sessionId } as JwtPayload,
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role,
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      throw new AppError('Invalid input data', 400);
     }
  }
}

/**
 * POST /api/auth/logout
 * Destroy current session
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      res.status(200).json({ success: true, message: 'Already logged out' });
      return;
    }

    await prisma.session.deleteMany({
      where: {
        userId: userPayload.userId,
        sessionId: userPayload.sessionId,
      },
    });

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to logout', 500);
  }
};

/**
 * GET /api/auth/me
   * Get current authenticated user info
   */
  export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userPayload = authenticate(req);
      if (!userPayload) {
        throw new AppError('Authentication required', 401);
      }

      // Fetch user and addresses in parallel
      const [user, addresses] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userPayload.userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true,
            emailVerified: true,
            createdAt: true,
            role: true,
            buyer: true,
            seller: true,
          },
        }),
        prisma.address.findMany({
          where: { userId: userPayload.userId },
          orderBy: { isDefault: 'desc' },
          take: 5,
        }),
      ]);

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Get stats
      const [ordersCount, wishlistCount] = await Promise.all([
        prisma.order.count({ where: { buyerId: user.id } }),
        prisma.wishlist.count({ where: { userId: user.id } }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone || '',
          avatar: absUrl(user.avatar || ''),
          role: user.role,
          emailVerified: user.emailVerified,
          memberSince: user.createdAt,
          stats: { orders: ordersCount, wishlist: wishlistCount },
          addresses,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get current user', 500);
    }
  };

  /**
   * PATCH /api/auth/me
   * Update current user's profile (name, phone, avatar)
   */
  /**
   * PATCH /api/auth/me
   * Update current user's profile (name, phone, avatar)
   * All fields are optional — only provided fields will be updated
   */
  export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userPayload = authenticate(req);
      if (!userPayload) {
        throw new AppError('Authentication required', 401);
      }

      const { firstName, lastName, phone, avatar } = req.body;

      // Build update payload with only provided fields
      const updateData: any = {};

      if (firstName !== undefined) {
        const trimmed = firstName.trim();
        if (!trimmed) throw new AppError('First name cannot be empty', 400);
        updateData.firstName = trimmed;
      }
      if (lastName !== undefined) {
        const trimmed = lastName.trim();
        if (!trimmed) throw new AppError('Last name cannot be empty', 400);
        updateData.lastName = trimmed;
      }
      if (phone !== undefined) {
        updateData.phone = phone ? phone.trim() : null;
      }
      if (avatar !== undefined) {
        updateData.avatar = avatar; // base64 data URL or string URL
      }

      // If nothing to update, short-circuit
      if (Object.keys(updateData).length === 0) {
        throw new AppError('No fields provided for update', 400);
      }

      const updatedUser = await prisma.user.update({
        where: { id: userPayload.userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          emailVerified: true,
          createdAt: true,
          role: true,
          buyer: true,
          seller: true,
        },
      });

      // Get updated stats and addresses
      const [ordersCount, wishlistCount, addresses] = await Promise.all([
        prisma.order.count({ where: { buyerId: updatedUser.id } }),
        prisma.wishlist.count({ where: { userId: updatedUser.id } }),
        prisma.address.findMany({
          where: { userId: updatedUser.id },
          orderBy: { isDefault: 'desc' },
          take: 5,
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          phone: updatedUser.phone || '',
          avatar: absUrl(updatedUser.avatar || ''),
          role: updatedUser.role,
          emailVerified: updatedUser.emailVerified,
          memberSince: updatedUser.createdAt,
          stats: { orders: ordersCount, wishlist: wishlistCount },
          addresses,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update profile', 500);
    }
  };

 /**
  * PATCH /api/auth/me/address
  * Update or create user's default address
  */
  export const updateAddress = async (req: Request, res: Response): Promise<void> => {
    try {
      const userPayload = authenticate(req);
      if (!userPayload) {
        throw new AppError('Authentication required', 401);
      }

      const { street, city, state, zipCode, country, label, notes } = req.body;

      // Check if user already has an address
      const existingAddress = await prisma.address.findFirst({
        where: { userId: userPayload.userId },
      });

      let address;
      if (existingAddress) {
        // Update existing — only provided fields
        const updateData: any = {};
        if (street !== undefined) updateData.street = street;
        if (city !== undefined) updateData.city = city;
        if (state !== undefined) updateData.state = state;
        if (zipCode !== undefined) updateData.zipCode = zipCode;
        if (country !== undefined) updateData.country = country;
        if (label !== undefined) updateData.label = label;
        if (notes !== undefined) updateData.notes = notes;

        address = await prisma.address.update({
          where: { id: existingAddress.id },
          data: updateData,
        });
      } else {
        // Create new — require street/city/state, set defaults for others
        address = await prisma.address.create({
          data: {
            userId: userPayload.userId,
            street: street || '',
            city: city || '',
            state: state || '',
            zipCode: zipCode || '',
            country: country || 'Ghana',
            notes: notes || null,
            isDefault: true,
            label: label || 'Home',
          },
        });
      }

      res.status(200).json({
        success: true,
        data: address,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update address', 500);
    }
  };

  /**
   * POST /api/auth/forgot-password
   * Request password reset link for user account
   */
  export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      console.log(`[forgotPassword] Request received for email: ${email}`);

      // Find user by email (if not found, still return success for security)
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        console.log(`[forgotPassword] No user found with email: ${email}`);
        res.status(200).json({
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.',
        });
        return;
      }

      console.log(`[forgotPassword] User found: ${user.id}, sending reset email`);

      // Delete any existing unused reset tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });

      // Generate new token
      const resetToken = generateToken(32);
      const expiresAt = getTokenExpiry();
      console.log(`[forgotPassword] Generated reset token (first 8 chars): ${resetToken.substring(0,8)}...`);

      // Capture request metadata for tracking
      const ipAddress = (req as any).ip || (req as any).headers['x-forwarded-for']?.split(',')[0]?.trim() || null;
      const userAgent = req.headers['user-agent'] || null;

      // Store token
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt,
          ipAddress,
          userAgent,
        },
      });
      console.log(`[forgotPassword] Token stored in DB for user ${user.id}, expires: ${expiresAt}`);

        // Build redirect URL that preserves token via fragment
        const backendBaseUrl = getBackendBaseUrl().replace(/\/$/, '');
        const redirectUrl = `${backendBaseUrl}/api/auth/forgot-password-redirect/${resetToken}`;

        console.log(`[forgotPassword] Redirect URL for email: ${redirectUrl}`);

        // Send password reset email with redirect link
        await sendPasswordResetEmail(user.email, user.firstName || 'User', redirectUrl);
        console.log(`[forgotPassword] Password reset email sent to ${user.email}`);

      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (error) {
      console.error('[forgotPassword] Error:', error);
      if (error instanceof z.ZodError) {
        throw new AppError('Invalid email address', 400);
      }
      throw new AppError('Failed to process password reset request', 500);
    }
  };

  /**
   * POST /api/auth/reset-password
   * Reset user password using valid reset token
   */
  export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, newPassword } = resetPasswordSchema.parse(req.body);
      console.log(`[resetPassword] Request received`);
      console.log(`[resetPassword] Token (first 20 chars):`, token ? token.substring(0,20) + '...' : 'EMPTY');
      console.log(`[resetPassword] Password length:`, newPassword.length);

      // Find token record with user
      const resetTokenRecord = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!resetTokenRecord) {
        console.warn(`[resetPassword] Token not found in database`);
        console.warn(`[resetPassword] Looking for token:`, token);
        // For debugging: show all active tokens
        try {
          const allTokens = await prisma.passwordResetToken.findMany({
            where: { usedAt: null },
            select: { token: true, expiresAt: true, userId: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
          });
          console.log(`[resetPassword] Recent active tokens in DB:`, JSON.stringify(allTokens, null, 2));
        } catch (e) {
          console.log('[resetPassword] Could not fetch tokens for debugging:', e);
        }
        throw new AppError('Invalid or already used reset token', 404);
      }

      console.log(`[resetPassword] Token found. User:`, resetTokenRecord.userId, 'Expires:', resetTokenRecord.expiresAt, 'Used:', resetTokenRecord.usedAt);

      // Check if token is expired
      if (resetTokenRecord.expiresAt < new Date()) {
        await prisma.passwordResetToken.delete({
          where: { id: resetTokenRecord.id },
        });
        throw new AppError('Reset token has expired. Please request a new one.', 410);
      }

      // Check if token already used
      if (resetTokenRecord.usedAt) {
        throw new AppError('This reset token has already been used', 400);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Perform password update, token invalidation, session cleanup, and notification in a transaction
      await prisma.$transaction(async (tx) => {
        // Update user password
        await tx.user.update({
          where: { id: resetTokenRecord.userId },
          data: { password: hashedPassword },
        });

        // Mark token as used
        await tx.passwordResetToken.update({
          where: { id: resetTokenRecord.id },
          data: { usedAt: new Date() },
        });

        // Delete all existing sessions to force re-login on all devices (security)
        await tx.session.deleteMany({
          where: { userId: resetTokenRecord.userId },
        });

        // Create notification for user about password change
        await NotificationService.create({
          userId: resetTokenRecord.userId,
          type: 'password_changed',
          title: 'Password Changed',
          message: 'Your password was successfully changed. If you did not perform this action, please contact support immediately.',
          priority: 'high',
        });
      });

      // Send confirmation email after transaction commits
      const displayName = resetTokenRecord.user.firstName || 'User';
      const frontendUrl = getVerificationBaseUrl().replace(/\/$/, '');
      await sendPasswordChangedEmail(resetTokenRecord.user.email, displayName, frontendUrl);

      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully. You can now log in with your new password.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError('Invalid input', 400);
      }
      if (error instanceof AppError) {
        throw error;
      }
       throw new AppError('Failed to reset password', 500);
    }
  };

  /**
   * GET /api/auth/forgot-password-redirect/:token
   * Validates the reset token server-side and redirects to the reset page
   * with the token in URL fragment (not query) to survive email proxies.
   */
  export const redirectForgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.params;

      if (!token) {
        const errorUrl = `${getVerificationBaseUrl()}/pages/auth/forgot-password.html#error=invalid_token`;
        console.warn(`[redirectForgotPassword] Missing token`);
        res.redirect(302, errorUrl);
        return;
      }

      // Validate that the token exists and is unused
      const resetTokenRecord = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!resetTokenRecord) {
        const errorUrl = `${getVerificationBaseUrl()}/pages/auth/forgot-password.html#error=invalid_token`;
        console.warn(`[redirectForgotPassword] Invalid token: ${token.substring(0,8)}...`);
        res.redirect(302, errorUrl);
        return;
      }

      // Check if token is expired
      if (resetTokenRecord.expiresAt < new Date()) {
        await prisma.passwordResetToken.delete({
          where: { id: resetTokenRecord.id },
        });
        const errorUrl = `${getVerificationBaseUrl()}/pages/auth/forgot-password.html#error=expired`;
        console.warn(`[redirectForgotPassword] Expired token: ${token.substring(0,8)}...`);
        res.redirect(302, errorUrl);
        return;
      }

      // Check if token already used
      if (resetTokenRecord.usedAt) {
        const errorUrl = `${getVerificationBaseUrl()}/pages/auth/forgot-password.html#error=already_used`;
        console.warn(`[redirectForgotPassword] Already used token: ${token.substring(0,8)}...`);
        res.redirect(302, errorUrl);
        return;
      }

      // Token is valid — redirect to reset page with token+email in fragment
      const encodedToken = encodeURIComponent(resetTokenRecord.token);
      const encodedEmail = encodeURIComponent(resetTokenRecord.user.email);
      const fragmentUrl = `${getVerificationBaseUrl()}/pages/auth/reset-password.html#token=${encodedToken}&email=${encodedEmail}`;

      console.log(`[redirectForgotPassword] Redirecting to reset page: ${fragmentUrl}`);
      res.redirect(302, fragmentUrl);
    } catch (error) {
      console.error('[redirectForgotPassword] Error:', error);
      const errorUrl = `${getVerificationBaseUrl()}/pages/auth/forgot-password.html#error=server_error`;
      res.redirect(302, errorUrl);
    }
  };



