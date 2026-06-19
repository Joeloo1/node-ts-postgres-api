-- CreateTable
CREATE TABLE "ShippingZone" (
    "id"            TEXT NOT NULL,
    "name"          VARCHAR(100) NOT NULL,
    "countries"     TEXT[] NOT NULL DEFAULT '{}',
    "flatRate"      DOUBLE PRECISION NOT NULL,
    "freeThreshold" DOUBLE PRECISION,
    "active"        BOOLEAN NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShippingZone_active_idx" ON "ShippingZone"("active");

-- AlterTable: add shipping fields to Order
ALTER TABLE "Order"
    ADD COLUMN "shippingCost"        DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN "shippingZoneId"      TEXT,
    ADD COLUMN "easypostShipmentId"  TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shippingZoneId_fkey"
    FOREIGN KEY ("shippingZoneId") REFERENCES "ShippingZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
