-- Add missing values to the existing ProductCategory enum so the database matches schema.prisma
ALTER TYPE "ProductCategory" ADD VALUE IF NOT EXISTS 'fashion';
ALTER TYPE "ProductCategory" ADD VALUE IF NOT EXISTS 'food_services';
ALTER TYPE "ProductCategory" ADD VALUE IF NOT EXISTS 'art';
ALTER TYPE "ProductCategory" ADD VALUE IF NOT EXISTS 'services';
