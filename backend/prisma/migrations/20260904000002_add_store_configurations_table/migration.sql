-- CreateTable
CREATE TABLE "store_configurations" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "draft" JSONB NOT NULL,
    "published" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_configurations_sellerId_key" ON "store_configurations"("sellerId");

-- AddForeignKey
ALTER TABLE "store_configurations" ADD CONSTRAINT "store_configurations_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
