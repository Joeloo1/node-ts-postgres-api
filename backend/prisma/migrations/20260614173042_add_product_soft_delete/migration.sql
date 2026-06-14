-- AlterTable
ALTER TABLE "Products" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Products_deletedAt_idx" ON "Products"("deletedAt");
