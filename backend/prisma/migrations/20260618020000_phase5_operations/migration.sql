-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('FLASH_SALE', 'PERCENTAGE_OFF_CATEGORY');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_ORDER', 'LOW_STOCK', 'NEW_RETURN', 'NEW_CONTACT', 'NEW_REVIEW');

-- CreateTable
CREATE TABLE "Promotion" (
    "id"         TEXT NOT NULL,
    "name"       VARCHAR(200) NOT NULL,
    "type"       "PromotionType" NOT NULL,
    "value"      DOUBLE PRECISION NOT NULL,
    "categoryId" INTEGER,
    "startsAt"   TIMESTAMP(3) NOT NULL,
    "endsAt"     TIMESTAMP(3) NOT NULL,
    "active"     BOOLEAN NOT NULL DEFAULT false,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Banner" (
    "id"        TEXT NOT NULL,
    "title"     VARCHAR(200) NOT NULL,
    "subtitle"  VARCHAR(400),
    "imageUrl"  TEXT NOT NULL,
    "linkUrl"   TEXT,
    "position"  VARCHAR(50) NOT NULL,
    "active"    BOOLEAN NOT NULL DEFAULT true,
    "order"     INTEGER NOT NULL DEFAULT 0,
    "startsAt"  TIMESTAMP(3),
    "endsAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminNotification" (
    "id"        TEXT NOT NULL,
    "type"      "NotificationType" NOT NULL,
    "message"   TEXT NOT NULL,
    "read"      BOOLEAN NOT NULL DEFAULT false,
    "metadata"  JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Promotion_active_idx" ON "Promotion"("active");
CREATE INDEX "Promotion_active_startsAt_endsAt_idx" ON "Promotion"("active", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Banner_position_active_idx" ON "Banner"("position", "active");
CREATE INDEX "Banner_active_startsAt_endsAt_idx" ON "Banner"("active", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "AdminNotification_read_createdAt_idx" ON "AdminNotification"("read", "createdAt" DESC);
CREATE INDEX "AdminNotification_createdAt_idx" ON "AdminNotification"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;
