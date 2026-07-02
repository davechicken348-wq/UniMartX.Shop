import { z } from 'zod';

// All fields optional for partial update
export const updateProfileSchema = z.object({
  // User core fields
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().max(50).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  avatar: z.string().optional().nullable(),

  // Extended profile fields (General tab)
  bio: z.string().max(300).optional().nullable(),
  location: z.string().max(100).optional().nullable(),

  // Contact tab optional fields
  whatsapp: z.string().max(20).optional().nullable(),
  pickupAddress: z.string().max(200).optional().nullable(),

  // Social tab optional fields
  instagram: z.string().url().optional().nullable(),
  twitter: z.string().url().optional().nullable(),
  tiktok: z.string().url().optional().nullable(),
  website: z.string().url().optional().nullable(),

   // Store fields
   storeName: z.string().min(2).max(100).optional(),
   storeDescription: z.string().min(20).max(300).optional().nullable(),
   category: z.string().optional(),
   country: z.string().min(2).optional().nullable(),
   city: z.string().min(2).optional().nullable(),
    // Branding fields
    storeBanner: z.string().optional().nullable(),
    storeAvatar: z.string().optional().nullable(),
    storeColor: z.string().optional().nullable(),
    deliveryFee: z.coerce.number().nonnegative().optional().nullable(),
});

