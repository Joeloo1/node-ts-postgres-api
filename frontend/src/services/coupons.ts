import { apiFetch } from "../lib/api";

export type CouponValidateResult = {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  discount: number;
  newTotal: number;
};

export type Coupon = {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minOrderTotal: number | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
};

type ValidateRes = { status: string; data: { coupon: CouponValidateResult } };
type AdminListRes = { status: string; dat: { coupon: Coupon[] } };
type AdminOneRes  = { status: string; data: { coupon: Coupon } };

export async function validateCoupon(code: string, orderTotal: number): Promise<CouponValidateResult> {
  const res = await apiFetch<ValidateRes>("/api/v1/coupons/validate", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ code, orderTotal }),
  });
  return res.data.coupon;
}

export async function adminListCoupons(): Promise<Coupon[]> {
  const res = await apiFetch<AdminListRes>("/api/v1/admin/coupons", { auth: true });
  // backend has a typo: `dat` not `data`
  return res.dat?.coupon ?? [];
}

export type CreateCouponInput = {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minOrderTotal?: number;
  maxUses?: number;
  expiresAt?: string;
  active?: boolean;
};

export async function adminCreateCoupon(input: CreateCouponInput): Promise<Coupon> {
  const res = await apiFetch<AdminOneRes>("/api/v1/admin/coupons", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
  return res.data.coupon;
}

export async function adminToggleCoupon(id: string, active: boolean): Promise<Coupon> {
  const res = await apiFetch<AdminOneRes>(`/api/v1/admin/coupons/${id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ active }),
  });
  return res.data.coupon;
}

export async function adminDeleteCoupon(id: string): Promise<void> {
  await apiFetch<{ status: string }>(`/api/v1/admin/coupons/${id}`, {
    method: "DELETE",
    auth: true,
  });
}
