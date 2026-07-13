-- Additive migration: SellerReview model + seller policy columns
-- (Intentionally scoped to avoid touching unrelated existing schema drift.)

-- 1. New seller_reviews table
CREATE TABLE IF NOT EXISTS "seller_reviews" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "communication" INTEGER,
  "shipping" INTEGER,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "seller_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "seller_reviews_sellerId_userId_key"
  ON "seller_reviews" ("sellerId", "userId");

CREATE INDEX IF NOT EXISTS "seller_reviews_sellerId_idx"
  ON "seller_reviews" ("sellerId");

ALTER TABLE "seller_reviews"
  ADD CONSTRAINT "seller_reviews_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "seller_reviews"
  ADD CONSTRAINT "seller_reviews_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Policy columns on sellers
ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "returnPolicy" TEXT;
ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "shippingPolicy" TEXT;
ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "refundPolicy" TEXT;
ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "exchangePolicy" TEXT;
ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "cancellationPolicy" TEXT;
ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "processingTime" TEXT;

-- 3. Seller slug (unique) for store URLs
ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "slug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "sellers_slug_key" ON "sellers"("slug");
CREATE INDEX IF NOT EXISTS "sellers_slug_idx" ON "sellers"("slug");
