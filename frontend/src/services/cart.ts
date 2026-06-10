import { apiFetch } from "../lib/http";
import type { Cart } from "../lib/types";

type CartRes = { status: string; data: { cart: Cart } };

export async function getCart(): Promise<Cart> {
  const res = await apiFetch<CartRes>("/api/v1/cart", { auth: true });
  return res.data.cart;
}

export async function addItem(productId: string, quantity: number): Promise<void> {
  await apiFetch("/api/v1/cart/items", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ product_id: productId, quantity }),
  });
}

export async function updateItem(itemId: string, quantity: number): Promise<void> {
  await apiFetch(`/api/v1/cart/items/${itemId}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ quantity }),
  });
}

export async function removeItem(itemId: string): Promise<void> {
  await apiFetch(`/api/v1/cart/items/${itemId}`, { method: "DELETE", auth: true });
}

export async function clearCart(): Promise<void> {
  await apiFetch("/api/v1/cart", { method: "DELETE", auth: true });
}
