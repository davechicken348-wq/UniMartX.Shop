-- Adds columns present in schema.prisma but missing from the database.
-- IF NOT EXISTS guards make this idempotent.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "smsVerified" BOOLEAN DEFAULT false;

ALTER TABLE "sellers"
  ADD COLUMN IF NOT EXISTS "pickupAddress" TEXT;
