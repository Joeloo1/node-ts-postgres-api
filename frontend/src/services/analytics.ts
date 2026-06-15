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

export interface LowStockProduct {
  product_id: string;
  name: string;
  stock: number | null;
  price: number;
  image: string | null;
}

export interface OrdersByStatus {
  status: string;
  count: number;
}

export interface DashboardStats {
  totals: {
    revenue: number;
    orders: number;
    recentOrders: number;
    users: number;
    products: number;
    avgOrderValue: number;
  };
  revenueByDay: RevenueDay[];
  topProducts: TopProduct[];
  lowStockProducts: LowStockProduct[];
  ordersByStatus: OrdersByStatus[];
}

type DashboardRes = { status: string; data: DashboardStats };

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await apiFetch<DashboardRes>("/api/v1/admin/analytics/dashboard", { auth: true });
  return res.data;
}
