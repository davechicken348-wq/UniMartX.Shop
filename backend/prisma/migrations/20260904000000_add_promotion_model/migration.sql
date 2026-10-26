-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('percentage', 'fixed');

-- CreateEnum
CREATE TYPE "PromotionTarget" AS ENUM ('store', 'selected');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('active', 'scheduled', 'ended', 'draft');

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "PromotionType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "target" "PromotionTarget" NOT NULL,
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "status" "PromotionStatus" NOT NULL DEFAULT 'draft',
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promotions_sellerId_idx" ON "promotions"("sellerId");

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
