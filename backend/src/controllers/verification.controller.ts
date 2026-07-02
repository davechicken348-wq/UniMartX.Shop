import { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { generateToken, getTokenExpiry } from '../utils/token';
import { sendVerificationEmail, getBackendBaseUrl, getVerificationBaseUrl } from '../services/email.service';

// Schema for resend request
export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * GET /api/auth/verify/:token
 * Verify user's email address using the token sent via email
 */
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token) {
      throw new AppError('Verification token is required', 400);
    }

    // Find the verification token
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken) {
      throw new AppError('Invalid or already used verification token', 404);
    }

    // Check if token is expired
    if (verificationToken.expiresAt < new Date()) {
      // Delete expired token
      await prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      });
      throw new AppError('Verification token has expired. Please request a new one.', 410);
    }

    // Check if user is already verified
    if (verificationToken.user.emailVerified) {
      // Clean up token
      await prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      });
      throw new AppError('Email is already verified', 409);
    }

    // Update user verification status and delete the token in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: true },
      });

      await tx.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      });
    });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to verify email', 500);
  }
};

/**
 * GET /api/auth/verify-redirect/:token
 * Validates the token server-side and redirects to the verification page
 * with the token embedded in the URL fragment (not query params).
 *
 * Fragments are never sent to the server in HTTP requests,
 * so they survive Gmail's link protection proxy unscathed.
 */
export const redirectVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token) {
      throw new AppError('Verification token is required', 400);
    }

    // Validate that the token exists in the database (without revealing details)
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken) {
      // Token not found — redirect with error in fragment
      const errorUrl = `${getVerificationBaseUrl()}/pages/auth/verify-email.html#error=invalid`;
      console.warn(`[redirectVerification] Invalid token attempted: ${token.substring(0, 8)}...`);
      res.redirect(302, errorUrl);
      return;
    }

    // Check if token is expired
    if (verificationToken.expiresAt < new Date()) {
      const errorUrl = `${getVerificationBaseUrl()}/pages/auth/verify-email.html#error=expired`;
      console.warn(`[redirectVerification] Expired token: ${token.substring(0, 8)}...`);
      res.redirect(302, errorUrl);
      return;
    }

    // Check if user is already verified
    if (verificationToken.user.emailVerified) {
      const errorUrl = `${getVerificationBaseUrl()}/pages/auth/verify-email.html#error=already_verified`;
      res.redirect(302, errorUrl);
      return;
    }

    // Token is valid — redirect to the verification HTML page with token+email in the fragment
    // The fragment (#) portion of the URL is never sent to the server in requests,
    // so it will survive Gmail's link-rewriting proxy intact.
    const encodedToken = encodeURIComponent(verificationToken.token);
    const encodedEmail = encodeURIComponent(verificationToken.user.email);
    const fragmentUrl = `${getVerificationBaseUrl()}/pages/auth/verify-email.html#token=${encodedToken}&email=${encodedEmail}`;

    console.log(`[redirectVerification] Redirecting user to fragment URL for token: ${token.substring(0, 8)}...`);
    res.redirect(302, fragmentUrl);

  } catch (error) {
    console.error('[redirectVerification] Error:', error);
    const errorUrl = `${getVerificationBaseUrl()}/pages/auth/verify-email.html#error=server_error`;
    res.redirect(302, errorUrl);
  }
};

/**
 * POST /api/auth/resend-verification
 * Resend verification email to user
 */
export const resendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = resendVerificationSchema.parse(req.body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { verificationToken: true },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
      });
      return;
    }

    // Check if already verified
    if (user.emailVerified) {
      res.status(200).json({
        success: true,
        message: 'Email is already verified. You can log in.',
      });
      return;
    }

    // Delete any existing token for this user
    if (user.verificationToken) {
      await prisma.emailVerificationToken.delete({
        where: { id: user.verificationToken.id },
      });
    }

    // Generate new token
    const verificationToken = generateToken(32);
    const expiresAt = getTokenExpiry();

    // Store new token
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt: expiresAt,
      },
    });

     // Send verification email — link goes through the backend redirect endpoint
     // The token is in the URL PATH, not query params, so it survives Gmail's proxy.
     const verificationUrl = `${getBackendBaseUrl()}/api/auth/verify-redirect/${verificationToken}`;

    const displayName = user.firstName || 'User';
    await sendVerificationEmail(user.email, displayName, verificationUrl);

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully.',
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
      throw new AppError('Failed to resend verification email', 500);
    }
  };
