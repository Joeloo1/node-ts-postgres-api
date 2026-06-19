-- Phase 4: User Engagement & Retention
-- LoyaltyAccount, LoyaltyTransaction, GiftCard, GiftCardRedemption, Referral + referralCode on User

-- Enums
CREATE TYPE "Tier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');
CREATE TYPE "LoyaltyTransactionType" AS ENUM ('EARNED', 'REDEEMED', 'BONUS', 'EXPIRED');
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'COMPLETED');

-- User: add referralCode
ALTER TABLE "User" ADD COLUMN "referralCode" VARCHAR(20);
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- LoyaltyAccount
CREATE TABLE "LoyaltyAccount" (
    "id"             TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "points"         INTEGER NOT NULL DEFAULT 0,
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "tier"           "Tier" NOT NULL DEFAULT 'BRONZE',
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LoyaltyAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LoyaltyAccount_userId_key" ON "LoyaltyAccount"("userId");
CREATE INDEX "LoyaltyAccount_userId_idx" ON "LoyaltyAccount"("userId");
ALTER TABLE "LoyaltyAccount" ADD CONSTRAINT "LoyaltyAccount_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- LoyaltyTransaction
CREATE TABLE "LoyaltyTransaction" (
    "id"          TEXT NOT NULL,
    "accountId"   TEXT NOT NULL,
    "type"        "LoyaltyTransactionType" NOT NULL,
    "points"      INTEGER NOT NULL,
    "description" VARCHAR(300),
    "orderId"     TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LoyaltyTransaction_accountId_idx" ON "LoyaltyTransaction"("accountId");
CREATE INDEX "LoyaltyTransaction_createdAt_idx" ON "LoyaltyTransaction"("createdAt" DESC);
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "LoyaltyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- GiftCard
CREATE TABLE "GiftCard" (
    "id"             TEXT NOT NULL,
    "code"           VARCHAR(20) NOT NULL,
    "balance"        DOUBLE PRECISION NOT NULL,
    "initialBalance" DOUBLE PRECISION NOT NULL,
    "purchasedById"  TEXT NOT NULL,
    "recipientEmail" TEXT,
    "active"         BOOLEAN NOT NULL DEFAULT true,
    "expiresAt"      TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GiftCard_code_key" ON "GiftCard"("code");
CREATE INDEX "GiftCard_code_idx" ON "GiftCard"("code");
CREATE INDEX "GiftCard_active_idx" ON "GiftCard"("active");
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_purchasedById_fkey"
    FOREIGN KEY ("purchasedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- GiftCardRedemption
CREATE TABLE "GiftCardRedemption" (
    "id"         TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "orderId"    TEXT NOT NULL,
    "amount"     DOUBLE PRECISION NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GiftCardRedemption_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GiftCardRedemption_giftCardId_idx" ON "GiftCardRedemption"("giftCardId");
ALTER TABLE "GiftCardRedemption" ADD CONSTRAINT "GiftCardRedemption_giftCardId_fkey"
    FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Referral
CREATE TABLE "Referral" (
    "id"          TEXT NOT NULL,
    "referrerId"  TEXT NOT NULL,
    "refereeId"   TEXT NOT NULL,
    "status"      "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Referral_refereeId_key" ON "Referral"("refereeId");
CREATE INDEX "Referral_referrerId_idx" ON "Referral"("referrerId");
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey"
    FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeId_fkey"
    FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
