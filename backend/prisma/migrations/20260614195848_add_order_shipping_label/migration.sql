-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingLabel" TEXT;

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");

-- CreateIndex
CREATE INDEX "ReviewVote_userId_idx" ON "ReviewVote"("userId");
