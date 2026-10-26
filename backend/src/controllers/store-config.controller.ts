import { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { authenticate } from '../controllers/auth.controller';
import { Prisma } from '@prisma/client';

export interface StoreConfiguration {
  template: string;
  colors: {
    primary: string;
    accent: string;
    background: string;
    text: string;
    muted: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    headingStyle: string;
    textScale: string;
  };
  layout: {
    storeWidth: string;
    productGrid: number;
    sectionSpacing: string;
  };
  /** Generated storefront theme, derived from the seller's brand color. */
  storefrontTheme?: {
    primary: string;
    primaryHover: string;
    primaryActive: string;
    primarySoft: string;
    primaryMuted: string;
    accent: string;
    background: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    colorStyle: string;
  };
  sections: Array<{
    type: string;
    id: string;
    [key: string]: any;
  }>;
  /** Additional page compositions; `sections` remains the Home page. */
  pageSections?: Partial<Record<'products' | 'categories' | 'about' | 'contact' | 'reviews', Array<{
    type: string;
    id: string;
    [key: string]: any;
  }>>>;
}

export interface StoreConfigResponse {
  draft: StoreConfiguration | null;
  published: StoreConfiguration | null;
  publishedAt: string | null;
}

function getDefaultConfig(): StoreConfiguration {
  return {
    template: 'minimal',
    colors: {
      primary: '#16a34a',
      accent: '#16a34a',
      background: '#ffffff',
      text: '#111827',
      muted: '#6b7280',
    },
    typography: {
      headingFont: 'Quicksand',
      bodyFont: 'Quicksand',
      headingStyle: 'clean',
      textScale: 'balanced',
    },
    layout: {
      storeWidth: 'comfortable',
      productGrid: 3,
      sectionSpacing: 'comfortable',
    },
    storefrontTheme: {
      primary: '#16a34a',
      primaryHover: '#15803d',
      primaryActive: '#14532d',
      primarySoft: '#dcfce7',
      primaryMuted: '#bbf7d0',
      accent: '#16a34a',
      background: '#ffffff',
      surface: '#ffffff',
      surfaceAlt: '#f8fafc',
      text: '#111827',
      textSecondary: '#374151',
      textMuted: '#6b7280',
      border: '#e5e7eb',
      success: '#16a34a',
      warning: '#d97706',
      error: '#dc2626',
      colorStyle: 'modern',
    },
    sections: [
      {
        type: 'hero',
        id: 'hero-1',
        heading: 'Welcome to our store',
        description: 'Everything you need, right here.',
        buttonText: 'Shop now',
        buttonLink: '#products',
        layout: 'center',
        spacing: 'comfortable',
      },
      {
        type: 'featured-products',
        id: 'featured-1',
        heading: 'Featured Products',
        maxProducts: 4,
      },
      {
        type: 'about',
        id: 'about-1',
        heading: 'About the Store',
        body: '',
      },
    ],
  };
}

/**
 * GET /api/seller/store-config
 * Get current seller's store configuration (draft + published)
 */
export const getStoreConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const seller = await prisma.seller.findUnique({
      where: { userId: userPayload.userId },
      select: { id: true },
    });

    if (!seller) {
      throw new AppError('Seller not found', 404);
    }

    let config = await prisma.storeConfiguration.findUnique({
      where: { sellerId: seller.id },
    });

    // Do NOT auto-create a default draft here. Returning `draft: null`
    // signals "no draft yet" so the builder can show the welcome/empty
    // state instead of jumping straight into the canvas.
    if (!config) {
      res.status(200).json({
        success: true,
        data: {
          draft: null,
          published: null,
          publishedAt: null,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        draft: config.draft,
        published: config.published,
        publishedAt: config.publishedAt,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch store configuration', 500);
  }
};

/**
 * PATCH /api/seller/store-config
 * Update seller's draft store configuration
 */
export const updateStoreConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const { draft } = req.body as { draft?: StoreConfiguration };

    if (!draft || typeof draft !== 'object') {
      throw new AppError('Draft configuration is required', 400);
    }

    const seller = await prisma.seller.findUnique({
      where: { userId: userPayload.userId },
      select: { id: true },
    });

    if (!seller) {
      throw new AppError('Seller not found', 404);
    }

    const config = await prisma.storeConfiguration.upsert({
      where: { sellerId: seller.id },
      update: { draft: draft as unknown as Prisma.InputJsonValue },
      create: {
        sellerId: seller.id,
        draft: draft as unknown as Prisma.InputJsonValue,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        draft: config.draft,
        published: config.published,
        publishedAt: config.publishedAt,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update store configuration', 500);
  }
};

/**
 * POST /api/seller/store-config/publish
 * Publish current draft as the published configuration
 */
export const publishStoreConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = authenticate(req);
    if (!userPayload) {
      throw new AppError('Authentication required', 401);
    }

    const seller = await prisma.seller.findUnique({
      where: { userId: userPayload.userId },
      select: { id: true },
    });

    if (!seller) {
      throw new AppError('Seller not found', 404);
    }

    const config = await prisma.storeConfiguration.findUnique({
      where: { sellerId: seller.id },
    });

    if (!config) {
      throw new AppError('Store configuration not found', 404);
    }

    const now = new Date();
    const updated = await prisma.storeConfiguration.update({
      where: { sellerId: seller.id },
      data: {
        published: config.draft as unknown as Prisma.InputJsonValue,
        publishedAt: now,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        draft: updated.draft,
        published: updated.published,
        publishedAt: updated.publishedAt,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to publish store configuration', 500);
  }
};

/**
 * GET /api/public/store-config/:sellerId
 * Get published store configuration for public storefront
 */
export const getPublicStoreConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sellerId } = req.params;

    const config = await prisma.storeConfiguration.findUnique({
      where: { sellerId },
      select: {
        published: true,
        publishedAt: true,
      },
    });

    if (!config || !config.published) {
      res.status(200).json({
        success: true,
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        ...(config.published as Record<string, unknown>),
        publishedAt: config.publishedAt,
      },
    });
  } catch (error) {
    throw new AppError('Failed to fetch store configuration', 500);
  }
};
