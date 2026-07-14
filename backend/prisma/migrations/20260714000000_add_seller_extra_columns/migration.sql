-- Additive migration: missing Seller columns that exist in schema.prisma
-- but were never migrated to the database.

ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "storeTagline" TEXT;
ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "campus" TEXT;
ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "deliveryOptions" TEXT;
ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "businessHours" TEXT;
