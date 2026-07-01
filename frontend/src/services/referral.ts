import { apiFetch } from "../lib/api";

export type ReferralStatus = "PENDING" | "COMPLETED";

export interface ReferralEntry {
  id: string;
  status: ReferralStatus;
  createdAt: string;
  referee: { name: string; email: string } | null;
}

export interface ReferralData {
  referralCode: string;
  referralLink: string;
  stats: {
    total: number;
    completed: number;
    pointsEarned: number;
  };
  referrals: ReferralEntry[];
}

export async function getMyReferral(): Promise<ReferralData> {
  const res = await apiFetch<{ data: ReferralData }>("/api/v1/users/me/referral");
  return res.data;
}
