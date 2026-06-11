/*
  Warnings:

  - You are about to drop the column `useCount` on the `Coupon` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Coupon" DROP COLUMN "useCount",
ADD COLUMN     "usedCount" INTEGER NOT NULL DEFAULT 0;
