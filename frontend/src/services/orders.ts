import { apiFetch } from "../lib/http";
import type { Order } from "../lib/types";

type OrdersRes = { status: string; results: number; data: { orders: Order[] } };
type OrderRes  = { status: string; data: { order: Order } };

export async function getOrders(): Promise<Order[]> {
  const res = await apiFetch<OrdersRes>("/api/v1/order", { auth: true });
  return res.data.orders;
}

export async function getOrder(id: string): Promise<Order> {
  const res = await apiFetch<OrderRes>(`/api/v1/order/${id}`, { auth: true });
  return res.data.order;
}

export async function verifyCheckout(sessionId: string): Promise<Order> {
  const res = await apiFetch<OrderRes>(`/api/v1/order/verify/${sessionId}`, { auth: true });
  return res.data.order;
}

export async function createReturnRequest(orderId: string, reason: string): Promise<void> {
  await apiFetch(`/api/v1/order/${orderId}/return`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ reason }),
  });
}
