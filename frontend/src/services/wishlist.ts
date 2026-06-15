import { apiFetch } from "../lib/http";

export type WishlistItem = {
  id: string;
  product_id: string;
  createdAt: string;
  product: {
    product_id: string;
    name: string;
    price: number;
    discount: number | null;
    image: string | null;
    availability: boolean;
    stock?: number;
    rating: number | null;
  };
};

type WishlistRes = { status: string; data: { wishlist: WishlistItem[] } };

export async function getWishlist(): Promise<WishlistItem[]> {
  const res = await apiFetch<WishlistRes>("/api/v1/wishlist", { auth: true });
  return res.data.wishlist;
}

export async function addToWishlist(product_id: string): Promise<void> {
  await apiFetch("/api/v1/wishlist", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ product_id }),
  });
}

export async function removeFromWishlist(product_id: string): Promise<void> {
  await apiFetch(`/api/v1/wishlist/${product_id}`, { method: "DELETE", auth: true });
}

export async function clearWishlistAll(): Promise<void> {
  await apiFetch("/api/v1/wishlist", { method: "DELETE", auth: true });
}
