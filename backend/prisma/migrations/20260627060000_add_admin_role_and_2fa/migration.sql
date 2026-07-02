-- Create enum for user roles
CREATE TYPE "UserRole" AS ENUM ('buyer', 'seller', 'admin');

-- Add role and 2FA columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'buyer';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorBackupCodes" JSONB;

-- Index for role lookups
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");
