import { apiFetch } from "../lib/http";

export interface RevenueDay {
  date: string;
  revenue: number;
}

export interface TopProduct {
  product_id: string;
  name: string;
  image: string | null;
  unitsSold: number;
}

export interface DashboardStats {
  totals: {
    revenue: number;
    orders: number;
    recentOrders: number;
    users: number;
    products: number;
  };
  revenueByDay: RevenueDay[];
  topProducts: TopProduct[];
}

type DashboardRes = { status: string; data: DashboardStats };

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await apiFetch<DashboardRes>("/api/v1/admin/analytics/dashboard", { auth: true });
  return res.data;
}
