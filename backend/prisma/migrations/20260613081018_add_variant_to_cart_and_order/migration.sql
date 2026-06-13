-- AlterTable: add variantId to CartItem
ALTER TABLE "CartItem" ADD COLUMN "variantId" TEXT;

-- AlterTable: add variantId and variantName to OrderItem
ALTER TABLE "OrderItem" ADD COLUMN "variantId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variantName" TEXT;

-- AddForeignKey: CartItem.variantId -> ProductVariant.id
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: OrderItem.variantId -> ProductVariant.id
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
