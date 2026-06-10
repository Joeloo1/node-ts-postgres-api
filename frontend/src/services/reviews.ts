import { apiFetch } from "../lib/http";
import type { Review } from "../lib/types";

type ReviewsRes = { status: string; data: { reviews: Review[] } };

export async function getReviews(productId: string): Promise<Review[]> {
  const res = await apiFetch<ReviewsRes>(`/api/v1/reviews?product_id=${encodeURIComponent(productId)}`);
  return res.data.reviews;
}

export async function createReview(data: {
  product_id: string;
  rating: number;
  content?: string;
}): Promise<void> {
  await apiFetch("/api/v1/reviews", {
    method: "POST",
    auth: true,
    body: JSON.stringify(data),
  });
}

export async function voteReview(reviewId: string, helpful: boolean): Promise<void> {
  await apiFetch(`/api/v1/reviews/${reviewId}/vote`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ helpful }),
  });
}

export async function unvoteReview(reviewId: string): Promise<void> {
  await apiFetch(`/api/v1/reviews/${reviewId}/vote`, {
    method: "DELETE",
    auth: true,
  });
}
