import { apiFetch } from "../lib/api";

export type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
export type LoyaltyTransactionType = "EARNED" | "REDEEMED" | "BONUS" | "EXPIRED";

export interface LoyaltyTransaction {
  id: string;
  points: number;
  type: LoyaltyTransactionType;
  description: string;
  orderId: string | null;
  createdAt: string;
}

export interface LoyaltyAccount {
  points: number;
  tier: LoyaltyTier;
  lifetimePoints: number;
  redemptionValue: number;
  nextTierAt: number | null;
  transactions: LoyaltyTransaction[];
}

export async function getMyLoyalty(): Promise<LoyaltyAccount> {
  const res = await apiFetch<{ data: LoyaltyAccount }>("/api/v1/users/me/loyalty");
  return res.data;
}
