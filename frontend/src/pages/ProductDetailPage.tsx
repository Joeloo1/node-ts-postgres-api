import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Spinner } from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import { ApiError, apiFetch } from "../lib/api";
import { productImageUrl } from "../lib/productImage";
import type { Product, Review } from "../lib/types";
import {
  CartIcon,
  CheckIcon,
  ChevronRightIcon,
  MinusIcon,
  PackageIcon,
  PhoneIcon,
  PlusIcon,
  ShieldIcon,
  TruckIcon,
} from "../components/Icons";

type ProductRes = { status: string; data: { product: Product } };
type ReviewsRes = { status: string; data: { reviews: Review[] } };

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          className={`text-2xl leading-none transition-transform hover:scale-110 ${
            n <= display ? "text-amber-400" : "text-zinc-700"
          }`}
          aria-label={`Rate ${n} star${n !== 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
      <span className="ml-2 text-sm text-zinc-500">{value} of 5</span>
    </div>
  );
}

function DisplayStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`text-base leading-none ${n <= Math.round(rating) ? "text-amber-400" : "text-zinc-700"}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

const trustBadges = [
  { icon: TruckIcon, text: "Free shipping over $50" },
  { icon: PackageIcon, text: "30-day returns" },
  { icon: ShieldIcon, text: "Secure checkout" },
  { icon: PhoneIcon, text: "24/7 support" },
];

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [qty, setQty] = useState(1);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);

  const productQuery = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await apiFetch<ProductRes>(`/api/v1/products/${id}`);
      return res.data.product;
    },
    enabled: Boolean(id),
  });

  const reviewsQuery = useQuery({
    queryKey: ["reviews", id],
    queryFn: async () => {
      const res = await apiFetch<ReviewsRes>(
        `/api/v1/reviews?product_id=${encodeURIComponent(id!)}`,
        { auth: true },
      );
      return res.data.reviews;
    },
    enabled: Boolean(id) && Boolean(user),
  });

  const addCart = useMutation({
    mutationFn: async () => {
      await apiFetch("/api/v1/cart/items", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ product_id: id, quantity: qty }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2500);
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      await apiFetch("/api/v1/reviews", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          product_id: id,
          rating,
          content: reviewText.trim() || undefined,
        }),
      });
    },
    onSuccess: () => {
      setFormError(null);
      setReviewText("");
      queryClient.invalidateQueries({ queryKey: ["reviews", id] });
    },
    onError: (e) => {
      setFormError(e instanceof ApiError ? e.message : "Could not submit review");
    },
  });

  const p = productQuery.data;
  const gallery = useMemo(() => {
    if (!p) return [];
    const imgs = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
    if (p.image && !imgs.includes(p.image)) imgs.unshift(p.image);
    return imgs;
  }, [p]);

  useEffect(() => {
    if (!p) return;
    const first = gallery[0] ?? productImageUrl(p);
    setActiveImage(first);
  }, [p?.product_id, gallery]);

  if (productQuery.isPending) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (productQuery.isError || !p) {
    return (
      <div className="rounded-2xl border border-zinc-800/70 p-10 text-center">
        <p className="text-zinc-400">Product not found.</p>
        <Link
          to="/products"
          className="mt-4 inline-block text-emerald-400 transition-colors hover:underline"
        >
          Back to shop
        </Link>
      </div>
    );
  }

  const displayPrice =
    p.discount && p.discount > 0 ? p.price * (1 - p.discount / 100) : p.price;
  const categoryName =
    p.category && "name" in p.category ? p.category.name : null;

  return (
    <div className="space-y-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-zinc-500" aria-label="Breadcrumb">
        <Link to="/" className="transition-colors hover:text-zinc-300">Home</Link>
        <ChevronRightIcon className="size-3.5 text-zinc-700" />
        <Link to="/products" className="transition-colors hover:text-zinc-300">Shop</Link>
        <ChevronRightIcon className="size-3.5 text-zinc-700" />
        <span className="line-clamp-1 text-zinc-400">{p.name}</span>
      </nav>

      {/* Product layout */}
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">

        {/* Gallery */}
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/50">
            <img
              src={activeImage ?? productImageUrl(p)}
              alt={p.name}
              className="aspect-square w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
            />
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {gallery.map((src) => {
                const isActive = src === activeImage;
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setActiveImage(src)}
                    className={`shrink-0 overflow-hidden rounded-xl border-2 bg-zinc-900/40 transition-all ${
                      isActive
                        ? "border-emerald-500 shadow-md shadow-emerald-900/30"
                        : "border-zinc-800 hover:border-zinc-600"
                    }`}
                    aria-label="View product image"
                  >
                    <img
                      src={src}
                      alt=""
                      className="h-20 w-20 object-cover"
                      loading="lazy"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-6">
          {/* Category + availability */}
          <div className="flex items-center gap-3">
            {categoryName && (
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-500/90">
                {categoryName}
              </span>
            )}
            {p.availability ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                In stock
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 border border-zinc-700/40 px-2.5 py-0.5 text-xs font-semibold text-zinc-400">
                Out of stock
              </span>
            )}
          </div>

          <div>
            <h1 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
              {p.name}
            </h1>
            {p.brand && (
              <p className="mt-2 text-sm text-zinc-500">by {p.brand}</p>
            )}
          </div>

          {/* Price + rating */}
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold tabular-nums text-white">
              ${displayPrice.toFixed(2)}
            </span>
            {p.discount && p.discount > 0 ? (
              <>
                <span className="text-lg text-zinc-500 line-through">
                  ${p.price.toFixed(2)}
                </span>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-0.5 text-sm font-bold text-emerald-400">
                  −{Math.round(p.discount)}%
                </span>
              </>
            ) : null}
          </div>

          {p.rating != null && (
            <div className="flex items-center gap-2">
              <DisplayStars rating={p.rating} />
              <span className="text-sm font-semibold text-amber-400">
                {p.rating.toFixed(1)}
              </span>
              <span className="text-xs text-zinc-600">/ 5.0</span>
            </div>
          )}

          {p.description && (
            <p className="leading-relaxed text-zinc-400">{p.description}</p>
          )}

          {/* Quantity + Add to cart */}
          <div className="space-y-4 border-t border-zinc-800/60 pt-6">
            <div className="flex flex-wrap items-center gap-3">
              {/* Qty stepper */}
              <div className="flex items-center rounded-xl border border-zinc-700/80 bg-zinc-950">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3 py-2.5 text-zinc-400 transition-colors hover:text-white"
                  aria-label="Decrease quantity"
                >
                  <MinusIcon className="size-4" />
                </button>
                <span className="w-10 select-none text-center text-sm font-semibold text-white">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(99, q + 1))}
                  className="px-3 py-2.5 text-zinc-400 transition-colors hover:text-white"
                  aria-label="Increase quantity"
                >
                  <PlusIcon className="size-4" />
                </button>
              </div>

              {/* CTA */}
              {user ? (
                <button
                  type="button"
                  disabled={!p.availability || addCart.isPending}
                  onClick={() => addCart.mutate()}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all disabled:opacity-50 sm:flex-none ${
                    addedToCart
                      ? "bg-emerald-700"
                      : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  {addedToCart ? (
                    <>
                      <CheckIcon className="size-4" />
                      Added to cart
                    </>
                  ) : addCart.isPending ? (
                    "Adding…"
                  ) : (
                    <>
                      <CartIcon className="size-4" />
                      Add to cart
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    navigate("/login", { state: { from: `/products/${id}` } })
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-600 px-6 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 sm:flex-none"
                >
                  Sign in to purchase
                </button>
              )}
            </div>

            {!p.availability && (
              <p className="text-sm text-amber-300/90">
                This item is currently out of stock.
              </p>
            )}
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {trustBadges.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-xs text-zinc-500">
                <Icon className="size-3.5 shrink-0 text-zinc-400" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews section */}
      <section className="space-y-6 border-t border-zinc-800/60 pt-8">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-xl font-bold text-white">
            Customer reviews
          </h2>
          {reviewsQuery.data && reviewsQuery.data.length > 0 && (
            <p className="text-sm text-zinc-500">
              {reviewsQuery.data.length} review{reviewsQuery.data.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {!user ? (
          <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-6 text-center">
            <p className="text-zinc-500">
              <Link to="/login" className="font-medium text-emerald-400 transition-colors hover:text-emerald-300">
                Sign in
              </Link>{" "}
              to read and write reviews.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Review list */}
            {reviewsQuery.isPending ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : reviewsQuery.data?.length ? (
              <ul className="space-y-3">
                {reviewsQuery.data.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-300">
                          {(r.user?.name ?? "C")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {r.user?.name ?? "Customer"}
                          </p>
                          <p className="text-xs text-zinc-600">
                            {new Date(r.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span
                            key={n}
                            className={`text-sm ${n <= r.rating ? "text-amber-400" : "text-zinc-700"}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    {r.content && (
                      <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                        {r.content}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-8 text-center">
                <p className="text-zinc-500">No reviews yet — be the first to leave one.</p>
              </div>
            )}

            {/* Write a review */}
            <form
              className="space-y-5 rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-6"
              onSubmit={(e) => {
                e.preventDefault();
                reviewMutation.mutate();
              }}
            >
              <h3 className="font-display text-base font-semibold text-white">
                Write a review
              </h3>

              {formError && (
                <div className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3">
                  <p className="text-sm text-red-300">{formError}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Your rating</label>
                <StarRating value={rating} onChange={setRating} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">
                  Comment{" "}
                  <span className="font-normal text-zinc-600">(optional)</span>
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={3}
                  placeholder="Share your thoughts about this product…"
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-600 transition focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={reviewMutation.isPending}
                className="rounded-xl bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-white disabled:opacity-50"
              >
                {reviewMutation.isPending ? "Submitting…" : "Submit review"}
              </button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
