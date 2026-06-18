import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { apiFetch } from "../../lib/http";
import { queryKeys } from "../../lib/queryKeys";
import type { Review } from "../../lib/types";
import { StarIcon, TrashIcon, SearchIcon } from "../../components/Icons";
import { usePageTitle } from "../../hooks/usePageTitle";

type AdminReviewsRes = { status: string; data: { reviews: Review[] } };

async function getAllReviews(): Promise<Review[]> {
  const res = await apiFetch<AdminReviewsRes>("/api/v1/admin/reviews", { auth: true });
  return res.data.reviews;
}

async function deleteReview(reviewId: string): Promise<void> {
  await apiFetch(`/api/v1/admin/reviews/${reviewId}`, { method: "DELETE", auth: true });
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} className="size-3" filled={rating >= n} />
      ))}
    </div>
  );
}

export function AdminReviewsPage() {
  usePageTitle("Reviews — Admin");
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const ADMIN_REVIEWS_KEY = ["admin", "reviews"] as const;

  const { data: reviews = [], isPending } = useQuery({
    queryKey: ADMIN_REVIEWS_KEY,
    queryFn: getAllReviews,
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteReview,
    onSuccess: () => {
      toast.success("Review deleted.");
      void qc.invalidateQueries({ queryKey: ADMIN_REVIEWS_KEY });
      void qc.invalidateQueries({ queryKey: queryKeys.reviews("") });
      setDeletingId(null);
    },
    onError: () => {
      toast.error("Failed to delete review.");
      setDeletingId(null);
    },
  });

  const filtered = reviews.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.content?.toLowerCase().includes(q) ||
      r.user?.name?.toLowerCase().includes(q) ||
      r.user?.email?.toLowerCase().includes(q) ||
      r.product_id.toLowerCase().includes(q);
    const matchRating = ratingFilter === null || r.rating === ratingFilter;
    return matchSearch && matchRating;
  });

  function confirmDelete(id: string) {
    setDeletingId(id);
  }

  function cancelDelete() {
    setDeletingId(null);
  }

  function doDelete(id: string) {
    deleteMutation.mutate(id);
  }

  const ratingCounts = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: reviews.filter((rv) => rv.rating === r).length,
  }));

  return (
    <>
      <Helmet>
        <title>Reviews — Admin · Northline</title>
        <meta name="description" content="Moderate and manage customer reviews." />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Reviews</h1>
            <p className="mt-0.5 text-sm text-ink3">
              {reviews.length} total review{reviews.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {ratingCounts.map(({ rating, count }) => (
            <button
              key={rating}
              type="button"
              onClick={() => setRatingFilter(ratingFilter === rating ? null : rating)}
              className={`rounded-xl border p-3 text-left transition-all ${
                ratingFilter === rating
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-stroke bg-card hover:border-edge"
              }`}
            >
              <div className="flex items-center gap-1">
                <StarIcon className="size-3.5 text-amber-400" filled />
                <span className="text-sm font-bold text-ink">{rating}</span>
              </div>
              <div className="mt-0.5 text-xs text-ink4">{count} review{count !== 1 ? "s" : ""}</div>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink4" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reviewer, content, or product ID…"
            className="w-full rounded-xl border border-stroke bg-input py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink4 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Reviews list */}
        {isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-raised" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-ink4">No reviews match your filters.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((review) => (
              <motion.div
                key={review.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-xl border border-stroke bg-card p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <RatingStars rating={review.rating} />
                      {review.verifiedPurchase && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Verified Purchase
                        </span>
                      )}
                      <span className="text-[11px] text-ink4">
                        {new Date(review.createdAt).toLocaleDateString("en-US", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink4">
                      <span className="font-medium text-ink3">{review.user?.name ?? "Anonymous"}</span>
                      {review.user?.email && <span>· {review.user.email}</span>}
                      <span>· Product: <span className="font-mono">{review.product_id.slice(0, 8)}…</span></span>
                    </div>

                    {review.content && (
                      <p className="mt-2 text-sm text-ink3 line-clamp-3">{review.content}</p>
                    )}

                    {review.votes && review.votes.length > 0 && (
                      <p className="mt-1.5 text-[11px] text-ink4">
                        {review.votes.filter((v) => v.helpful).length} found helpful
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">
                    {deletingId === review.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={cancelDelete}
                          className="rounded-lg border border-stroke px-2.5 py-1 text-[11px] font-semibold text-ink3 hover:bg-raised"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => doDelete(review.id)}
                          disabled={deleteMutation.isPending}
                          className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          {deleteMutation.isPending ? "Deleting…" : "Confirm delete"}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => confirmDelete(review.id)}
                        className="rounded-lg p-2 text-ink4 transition-colors hover:bg-red-500/10 hover:text-red-500"
                        aria-label="Delete review"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
