import { apiFetch } from "../lib/api";

export interface GiftCardBalance {
  code: string;
  balance: number;
  initialValue: number;
  expiresAt: string | null;
  active: boolean;
}

export interface MyGiftCard {
  id: string;
  code: string;
  balance: number;
  initialBalance: number;
  recipientEmail: string | null;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
  purchasedBy: { name: string; email: string } | null;
}

export interface PurchaseGiftCardInput {
  amount: number;
  recipientEmail: string;
  recipientName?: string;
  senderName?: string;
  message?: string;
}

export async function purchaseGiftCard(input: PurchaseGiftCardInput): Promise<{ code: string; amount: number }> {
  const res = await apiFetch<{ data: { code: string; amount: number } }>("/api/v1/gift-cards/purchase", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function checkGiftCardBalance(code: string): Promise<GiftCardBalance> {
  const res = await apiFetch<{ data: GiftCardBalance }>(`/api/v1/gift-cards/${encodeURIComponent(code)}/balance`);
  return res.data;
}

export async function getMyGiftCards(): Promise<MyGiftCard[]> {
  const res = await apiFetch<{ data: { giftCards: MyGiftCard[] } }>("/api/v1/gift-cards/my", { auth: true });
  return res.data.giftCards ?? [];
}
