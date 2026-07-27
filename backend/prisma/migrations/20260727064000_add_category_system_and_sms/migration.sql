-- Migration: add category system refinements, seller storeTags, SMS verification tokens
-- Brings the database in line with the updated schema.prisma.
-- All statements are idempotent where practical.

-- ---------------------------------------------------------------------------
-- 1. Missing columns on existing tables
-- ---------------------------------------------------------------------------

ALTER TABLE "sellers"
  ADD COLUMN IF NOT EXISTS "storeTags" TEXT[] DEFAULT '{}';

-- ---------------------------------------------------------------------------
-- 2. SMS verification tokens
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "sms_verification_tokens" (
  "id"        TEXT      NOT NULL PRIMARY KEY,
  "userId"    TEXT      NOT NULL UNIQUE,
  "phone"     TEXT      NOT NULL,
  "code"      VARCHAR(6) NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sms_verification_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "sms_verification_tokens_code_idx" ON "sms_verification_tokens"("code");
CREATE INDEX IF NOT EXISTS "sms_verification_tokens_userId_idx" ON "sms_verification_tokens"("userId");

-- ---------------------------------------------------------------------------
-- 3. Product category system migration (enum -> text + foreign keys)
-- ---------------------------------------------------------------------------

-- 3a. Convert existing enum column to text so we can add FK relations
ALTER TABLE "products"
  ALTER COLUMN "category" TYPE TEXT USING "category"::TEXT;

-- 3b. Add new category/subcategory FK columns
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "category_id" TEXT,
  ADD COLUMN IF NOT EXISTS "subcategory_id" TEXT;

-- 3c. Index for category lookups
CREATE INDEX IF NOT EXISTS "products_categoryId_idx" ON "products"("category_id");

-- 3d. Foreign keys to the new category tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_category_id_fkey') THEN
    ALTER TABLE "products"
      ADD CONSTRAINT "products_category_id_fkey"
      FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_subcategory_id_fkey') THEN
    ALTER TABLE "products"
      ADD CONSTRAINT "products_subcategory_id_fkey"
      FOREIGN KEY ("subcategory_id") REFERENCES "subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Drop old ProductCategory enum if nothing references it anymore
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductCategory') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_attribute
      WHERE atttypid = (SELECT oid FROM pg_type WHERE typname = 'ProductCategory')
        AND attnum > 0
        AND NOT attisdropped
    ) THEN
      DROP TYPE "ProductCategory";
    END IF;
  END IF;
END $$;
