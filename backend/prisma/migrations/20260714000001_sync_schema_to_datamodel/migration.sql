-- ============================================================================
-- Sync migration: brings the database in line with schema.prisma.
-- The initial migration was generated from an older schema and many later
-- edits (new tables + new columns + new enum values) were never migrated.
-- All statements are idempotent (IF NOT EXISTS) so re-running is safe.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Missing enum values
-- ---------------------------------------------------------------------------
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'refund_requested';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'seller_approved';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'seller_denied';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'disputed';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'denied';

-- ---------------------------------------------------------------------------
-- 2. Missing columns on existing tables
-- ---------------------------------------------------------------------------

-- users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "instagram" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tiktok" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twitter" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;

-- sellers (storeTagline/campus/deliveryOptions/businessHours are in the
-- 20260714000000 migration; these are the remaining ones)
ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "storeAvatar" TEXT;
ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "storeBanner" TEXT;
ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "storeColor" TEXT;
ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "deliveryFee" DECIMAL(10,2);

-- seller_verifications
ALTER TABLE "seller_verifications" ADD COLUMN IF NOT EXISTS "studentId" TEXT;
ALTER TABLE "seller_verifications" ADD COLUMN IF NOT EXISTS "studentEmail" TEXT;
ALTER TABLE "seller_verifications" ADD COLUMN IF NOT EXISTS "verificationMethod" TEXT;

-- products
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "comparePrice" DECIMAL(10,2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "condition" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "costPrice" DECIMAL(10,2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "details" JSONB;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "serviceType" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "tags" TEXT[];

-- orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentDetails" JSONB;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "fulfillmentType" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "sellerDeliveryFee" DECIMAL(10,2);

-- notifications
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "actionUrl" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "priority" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "productId" TEXT;

-- addresses
ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- ---------------------------------------------------------------------------
-- 3. Missing tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orderUpdates" BOOLEAN NOT NULL DEFAULT true,
  "wishlistAlerts" BOOLEAN NOT NULL DEFAULT true,
  "promotions" BOOLEAN NOT NULL DEFAULT true,
  "accountActivity" BOOLEAN NOT NULL DEFAULT true,
  "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
  "orderHistoryVisibility" BOOLEAN NOT NULL DEFAULT true,
  "personalizedRecommendations" BOOLEAN NOT NULL DEFAULT true,
  "lowStockAlerts" BOOLEAN NOT NULL DEFAULT true,
  "paymentNotifications" BOOLEAN NOT NULL DEFAULT true,
  "reviewNotifications" BOOLEAN NOT NULL DEFAULT true,
  "followAlerts" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_userId_key" ON "notification_preferences"("userId");

CREATE TABLE IF NOT EXISTS "follows" (
  "id" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "follows_buyerId_sellerId_key" ON "follows"("buyerId", "sellerId");
CREATE INDEX IF NOT EXISTS "follows_buyerId_idx" ON "follows"("buyerId");
CREATE INDEX IF NOT EXISTS "follows_sellerId_idx" ON "follows"("sellerId");

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_key" ON "password_reset_tokens"("token");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "deviceInfo" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_sessionId_key" ON "sessions"("sessionId");
CREATE INDEX IF NOT EXISTS "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX IF NOT EXISTS "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- RefundStatus enum (used by the refunds table)
CREATE TYPE IF NOT EXISTS "RefundStatus" AS ENUM (
  'refund_requested', 'seller_approved', 'seller_denied', 'disputed', 'refunded', 'denied'
);

CREATE TABLE IF NOT EXISTS "refunds" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "reason" TEXT,
  "message" TEXT,
  "evidence" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "status" "RefundStatus" NOT NULL DEFAULT 'refund_requested',
  "sellerResponse" TEXT,
  "sellerRespondedAt" TIMESTAMP(3),
  "refundMethod" TEXT,
  "sellerProof" TEXT,
  "buyerConfirmedAt" TIMESTAMP(3),
  "disputeReason" TEXT,
  "adminId" TEXT,
  "adminNote" TEXT,
  "adminDecision" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "refunds_orderId_key" ON "refunds"("orderId");
CREATE INDEX IF NOT EXISTS "refunds_buyerId_idx" ON "refunds"("buyerId");
CREATE INDEX IF NOT EXISTS "refunds_sellerId_idx" ON "refunds"("sellerId");
CREATE INDEX IF NOT EXISTS "refunds_status_idx" ON "refunds"("status");
CREATE INDEX IF NOT EXISTS "refunds_createdAt_idx" ON "refunds"("createdAt");

-- ---------------------------------------------------------------------------
-- 4. Foreign keys for the newly created tables (idempotent)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notification_preferences_userId_fkey') THEN
    ALTER TABLE "notification_preferences"
      ADD CONSTRAINT "notification_preferences_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'follows_buyerId_fkey') THEN
    ALTER TABLE "follows"
      ADD CONSTRAINT "follows_buyerId_fkey"
      FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'follows_sellerId_fkey') THEN
    ALTER TABLE "follows"
      ADD CONSTRAINT "follows_sellerId_fkey"
      FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_tokens_userId_fkey') THEN
    ALTER TABLE "password_reset_tokens"
      ADD CONSTRAINT "password_reset_tokens_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_userId_fkey') THEN
    ALTER TABLE "sessions"
      ADD CONSTRAINT "sessions_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refunds_orderId_fkey') THEN
    ALTER TABLE "refunds"
      ADD CONSTRAINT "refunds_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refunds_buyerId_fkey') THEN
    ALTER TABLE "refunds"
      ADD CONSTRAINT "refunds_buyerId_fkey"
      FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refunds_sellerId_fkey') THEN
    ALTER TABLE "refunds"
      ADD CONSTRAINT "refunds_sellerId_fkey"
      FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_productId_fkey') THEN
    ALTER TABLE "notifications"
      ADD CONSTRAINT "notifications_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
