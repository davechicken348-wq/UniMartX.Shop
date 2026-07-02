import { Request, Response } from 'express';
import { z, type ZodSchema } from 'zod';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { authenticate, type JwtPayload } from '../controllers/auth.controller';
import { updateProfileSchema } from '../schemas/seller-profile.schema';
import { uploadToR2, sellerAvatarKey, sellerBannerKey, sellerStoreAvatarKey, parseBase64 } from '../services/r2.service';

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

/**
 * GET /api/seller/profile
 * Fetch current seller's full profile (User + Seller data)
 */
export const getSellerProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    // Fetch user with related seller profile
    const user = await prisma.user.findUnique({
      where: { id: userPayload.userId },
      include: { seller: true },
    });

    if (!user || !user.seller) {
      throw new AppError('Seller profile not found', 404);
    }

     // Map DB fields to frontend field names
     const profileData = {
       // User fields
       firstName: user.firstName || '',
       lastName: user.lastName || '',
       email: user.email || '',
       phone: user.phone || '',
       avatar: absUrl(user.avatar || ''),
       bio: user.bio || '',
       location: user.location || '',
       whatsapp: user.whatsapp || '',
       instagram: user.instagram || '',
       twitter: user.twitter || '',
       tiktok: user.tiktok || '',
       website: user.website || '',

       // Seller fields
       sellerId: user.seller.id,
       storeName: user.seller.storeName || '',
       storeDescription: user.seller.storeDescription || '',
       category: user.seller.category || '',
       country: user.seller.country || '',
       city: user.seller.city || '',
       pickupAddress: user.seller.pickupAddress || '',
       businessType: user.seller.businessType || '',
       universityAffiliation: user.seller.universityAffiliation || '',
        // Branding
         storeBanner: absUrl(user.seller.storeBanner || ''),
         storeAvatar: absUrl(user.seller.storeAvatar || ''),
        storeColor: user.seller.storeColor || '',
        deliveryFee: user.seller.deliveryFee !== null && user.seller.deliveryFee !== undefined ? parseFloat(user.seller.deliveryFee.toString()) : null,
      };

    res.status(200).json({ success: true, data: profileData });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch profile', 500);
  }
};

/**
 * PATCH /api/seller/profile
 * Update seller profile (User + optional Seller fields)
 */
export const updateSellerProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const input = updateProfileSchema.parse(req.body);

    // Separate User and Seller updates
    const userUpdate: any = {};
    const sellerUpdate: any = {};

    // Map inputs to User columns
    if (input.firstName !== undefined) userUpdate.firstName = input.firstName.trim();
    if (input.lastName !== undefined) userUpdate.lastName = input.lastName ? input.lastName.trim() : '';
    if (input.phone !== undefined) userUpdate.phone = input.phone ? input.phone.trim() : null;
    if (input.avatar !== undefined) {
      if (input.avatar && input.avatar.startsWith('data:')) {
        const sellerForAvatar = await prisma.seller.findUnique({ where: { userId: userPayload.userId }, select: { id: true } });
        if (!sellerForAvatar) throw new AppError('Seller not found', 404);
        const { buffer, mime, ext } = parseBase64(input.avatar);
        userUpdate.avatar = await uploadToR2(sellerAvatarKey(sellerForAvatar.id, ext), buffer, mime);
      } else {
        userUpdate.avatar = input.avatar;
      }
    }
    if (input.bio !== undefined) userUpdate.bio = input.bio ? input.bio.trim() : null;
    if (input.location !== undefined) userUpdate.location = input.location ? input.location.trim() : null;
    if (input.whatsapp !== undefined) userUpdate.whatsapp = input.whatsapp ? input.whatsapp.trim() : null;
    if (input.instagram !== undefined) userUpdate.instagram = input.instagram ? input.instagram.trim() : null;
    if (input.twitter !== undefined) userUpdate.twitter = input.twitter ? input.twitter.trim() : null;
    if (input.tiktok !== undefined) userUpdate.tiktok = input.tiktok ? input.tiktok.trim() : null;
    if (input.website !== undefined) userUpdate.website = input.website ? input.website.trim() : null;

     // Map to Seller columns
     if (input.storeName !== undefined) sellerUpdate.storeName = input.storeName.trim();
     if (input.storeDescription !== undefined) sellerUpdate.storeDescription = input.storeDescription ? input.storeDescription.trim() : null;
     if (input.category !== undefined) sellerUpdate.category = input.category;
     if (input.country !== undefined) sellerUpdate.country = input.country ? input.country.trim() : null;
     if (input.city !== undefined) sellerUpdate.city = input.city ? input.city.trim() : null;
     if (input.pickupAddress !== undefined) sellerUpdate.pickupAddress = input.pickupAddress ? input.pickupAddress.trim() : null;
     if (input.storeBanner !== undefined) {
       if (input.storeBanner && input.storeBanner.startsWith('data:')) {
         const s = await prisma.seller.findUnique({ where: { userId: userPayload.userId }, select: { id: true } });
         if (!s) throw new AppError('Seller not found', 404);
         const { buffer, mime, ext } = parseBase64(input.storeBanner);
         sellerUpdate.storeBanner = await uploadToR2(sellerBannerKey(s.id, ext), buffer, mime);
       } else {
         sellerUpdate.storeBanner = input.storeBanner ? input.storeBanner.trim() : null;
       }
     }
     if (input.storeAvatar !== undefined) {
       if (input.storeAvatar && input.storeAvatar.startsWith('data:')) {
         const s = await prisma.seller.findUnique({ where: { userId: userPayload.userId }, select: { id: true } });
         if (!s) throw new AppError('Seller not found', 404);
         const { buffer, mime, ext } = parseBase64(input.storeAvatar);
         sellerUpdate.storeAvatar = await uploadToR2(sellerStoreAvatarKey(s.id, ext), buffer, mime);
       } else {
         sellerUpdate.storeAvatar = input.storeAvatar ? input.storeAvatar.trim() : null;
       }
     }
     if (input.storeColor !== undefined) sellerUpdate.storeColor = input.storeColor ? input.storeColor.trim() : null;
     if (input.deliveryFee !== undefined) sellerUpdate.deliveryFee = input.deliveryFee;

    if (Object.keys(userUpdate).length === 0 && Object.keys(sellerUpdate).length === 0) {
      throw new AppError('No fields provided for update', 400);
    }

    // Perform in transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Update User
      const user = await tx.user.update({
        where: { id: userPayload.userId },
        data: userUpdate,
        include: { seller: true },
      });

      // Update Seller if any changes
      if (Object.keys(sellerUpdate).length > 0) {
        await tx.seller.update({
          where: { userId: userPayload.userId },
          data: sellerUpdate,
        });
      }

      return user;
    });

    const { seller } = updatedUser;

     res.status(200).json({
       success: true,
       data: {
         firstName: updatedUser.firstName,
         lastName: updatedUser.lastName,
         email: updatedUser.email,
         phone: updatedUser.phone || '',
          avatar: absUrl(updatedUser.avatar || ''),
         bio: updatedUser.bio || '',
         location: updatedUser.location || '',
         whatsapp: updatedUser.whatsapp || '',
         instagram: updatedUser.instagram || '',
         twitter: updatedUser.twitter || '',
         tiktok: updatedUser.tiktok || '',
         website: updatedUser.website || '',
         sellerId: seller?.id || '',
         storeName: seller?.storeName || '',
         storeDescription: seller?.storeDescription || '',
         category: seller?.category || '',
         country: seller?.country || '',
         city: seller?.city || '',
         pickupAddress: seller?.pickupAddress || '',
         // Branding fields
          storeBanner: absUrl(seller?.storeBanner || ''),
          storeAvatar: absUrl(seller?.storeAvatar || ''),
         storeColor: seller?.storeColor || '',
       },
     });
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof z.ZodError) throw new AppError('Invalid input data', 400);
    throw new AppError('Failed to update profile', 500);
  }
};
