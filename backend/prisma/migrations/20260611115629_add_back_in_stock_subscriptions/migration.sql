-- CreateTable
CREATE TABLE "BackInStockSubscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "product_id" UUID NOT NULL,
    "userId" TEXT,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackInStockSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackInStockSubscription_product_id_notified_idx" ON "BackInStockSubscription"("product_id", "notified");

-- CreateIndex
CREATE UNIQUE INDEX "BackInStockSubscription_email_product_id_key" ON "BackInStockSubscription"("email", "product_id");

-- AddForeignKey
ALTER TABLE "BackInStockSubscription" ADD CONSTRAINT "BackInStockSubscription_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("product_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackInStockSubscription" ADD CONSTRAINT "BackInStockSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
