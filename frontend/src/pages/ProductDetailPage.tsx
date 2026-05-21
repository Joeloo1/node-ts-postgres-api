import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { ApiError, apiFetch } from "../lib/api";
import { productImageUrl } from "../lib/productImage";
import { ProductDetailSkeleton, ProductSkeletonGrid } from "../components/ProductSkeleton";
import { ProductCard } from "../components/ProductCard";
import type { Product, Review } from "../lib/types";
import {
  CartIcon,
  CheckIcon,
  ChevronRightIcon,
  HeartIcon,
  MinusIcon,
  PackageIcon,
  PhoneIcon,
  PlusIcon,
  ShieldIcon,
  TruckIcon,
} from "../components/Icons";

type ProductRes = { status: string; data: { product: Product } };
type ReviewsRes = { status: string; data: { reviews: Review[] } };
type ProductsRes = { status: string; data: { products: Product[] } };

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
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
          className={`text-2xl leading-none transition-transform hover:scale-110 ${n <= display ? "text-amber-400" : "text-ink4"}`}
          aria-label={`Rate ${n} star${n !== 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
      <span className="ml-2 text-sm text-ink4">{value} of 5</span>
    </div>
  );
}

function DisplayStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`text-base leading-none ${n <= Math.round(rating) ? "text-amber-400" : "text-ink4"}`}>★</span>
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

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const cardFade: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
};

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toggle, has } = useWishlist();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [qty, setQty] = useState(1);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);

  const isWishlisted = has(id ?? "");

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

  const p = productQuery.data;
  usePageTitle(p?.name ?? "Product");

  const relatedQuery = useQuery({
    queryKey: ["products", "related", p?.category_id, id],
    queryFn: async () => {
      const res = await apiFetch<ProductsRes>(
        `/api/v1/products?category_id=${p!.category_id}&limit=5&sortBy=rating&order=desc`,
      );
      return res.data.products.filter((x) => x.product_id !== id).slice(0, 4);
    },
    enabled: Boolean(p?.category_id),
  });

  const gallery = useMemo(() => {
    if (!p) return [];
    const imgs = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
    if (p.image && !imgs.includes(p.image)) imgs.unshift(p.image);
    return imgs;
  }, [p]);

  useEffect(() => {
    if (!p) return;
    setActiveImage(gallery[0] ?? productImageUrl(p));
  }, [p?.product_id]);

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
      toast.success("Added to cart");
    },
    onError: () => toast.error("Could not add to cart"),
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      await apiFetch("/api/v1/reviews", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ product_id: id, rating, content: reviewText.trim() || undefined }),
      });
    },
    onSuccess: () => {
      setFormError(null);
      setReviewText("");
      queryClient.invalidateQueries({ queryKey: ["reviews", id] });
      toast.success("Review submitted");
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : "Could not submit review";
      setFormError(msg);
      toast.error(msg);
    },
  });

  if (productQuery.isPending) return <ProductDetailSkeleton />;

  if (productQuery.isError || !p) {
    return (
      <div className="rounded-2xl border border-stroke p-10 text-center">
        <p className="text-ink3">Product not found.</p>
        <Link to="/products" className="mt-4 inline-block text-emerald-400 hover:underline">
          Back to shop
        </Link>
      </div>
    );
  }

  const displayPrice = p.discount && p.discount > 0 ? p.price * (1 - p.discount / 100) : p.price;
  const categoryName = p.category && "name" in p.category ? p.category.name : null;

  return (
    <motion.div className="space-y-16" variants={stagger} initial="hidden" animate="show">

      {/* Breadcrumb */}
      <motion.nav variants={fadeUp} className="flex items-center gap-1.5 text-xs text-ink4" aria-label="Breadcrumb">
        <Link to="/" className="transition-colors hover:text-ink2">Home</Link>
        <ChevronRightIcon className="size-3.5 text-ink4" />
        <Link to="/products" className="transition-colors hover:text-ink2">Shop</Link>
        <ChevronRightIcon className="size-3.5 text-ink4" />
        <span className="line-clamp-1 text-ink3">{p.name}</span>
      </motion.nav>

      {/* Product layout */}
      <motion.div variants={fadeUp} className="grid gap-10 lg:grid-cols-2 lg:gap-14">

        {/* Gallery */}
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-stroke bg-card">
            <AnimatePresence mode="wait" initial={false}>
              <motion.img
                key={activeImage}
                src={activeImage ?? productImageUrl(p)}
                alt={p.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="aspect-square w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
              />
            </AnimatePresence>
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
                    className={`shrink-0 overflow-hidden rounded-xl border-2 bg-card transition-all ${
                      isActive ? "border-emerald-500 shadow-md shadow-emerald-900/30" : "border-stroke hover:border-edge"
                    }`}
                    aria-label="View image"
                  >
                    <img src={src} alt="" className="h-20 w-20 object-cover" loading="lazy" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            {categoryName && (
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-500/90">
                {categoryName}
              </span>
            )}
            {p.availability ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                In stock
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-stroke bg-well px-2.5 py-0.5 text-xs font-semibold text-ink3">
                Out of stock
              </span>
            )}
          </div>

          <div>
            <h1 className="font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">{p.name}</h1>
            {p.brand && <p className="mt-2 text-sm text-ink4">by {p.brand}</p>}
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold tabular-nums text-ink">${displayPrice.toFixed(2)}</span>
            {p.discount && p.discount > 0 ? (
              <>
                <span className="text-lg text-ink4 line-through">${p.price.toFixed(2)}</span>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-0.5 text-sm font-bold text-emerald-400">
                  −{Math.round(p.discount)}%
                </span>
              </>
            ) : null}
          </div>

          {p.rating != null && (
            <div className="flex items-center gap-2">
              <DisplayStars rating={p.rating} />
              <span className="text-sm font-semibold text-amber-400">{p.rating.toFixed(1)}</span>
              <span className="text-xs text-ink4">/ 5.0</span>
            </div>
          )}

          {p.description && <p className="leading-relaxed text-ink3">{p.description}</p>}

          {/* Qty + CTA + Wishlist */}
          <div className="space-y-4 border-t border-stroke pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-xl border border-stroke bg-input">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2.5 text-ink3 transition-colors hover:text-ink" aria-label="Decrease">
                  <MinusIcon className="size-4" />
                </button>
                <span className="w-10 select-none text-center text-sm font-semibold text-ink">{qty}</span>
                <button type="button" onClick={() => setQty((q) => Math.min(99, q + 1))} className="px-3 py-2.5 text-ink3 transition-colors hover:text-ink" aria-label="Increase">
                  <PlusIcon className="size-4" />
                </button>
              </div>

              {user ? (
                <button
                  type="button"
                  disabled={!p.availability || addCart.isPending}
                  onClick={() => addCart.mutate()}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all disabled:opacity-50 sm:flex-none ${
                    addedToCart ? "bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20"
                  }`}
                >
                  {addedToCart ? (
                    <><CheckIcon className="size-4" />Added to cart</>
                  ) : addCart.isPending ? "Adding…" : (
                    <><CartIcon className="size-4" />Add to cart</>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate("/login", { state: { from: `/products/${id}` } })}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-edge px-6 py-3 text-sm font-semibold text-ink2 transition-colors hover:bg-hover sm:flex-none"
                >
                  Sign in to purchase
                </button>
              )}

              {/* Wishlist button */}
              <button
                type="button"
                onClick={() => {
                  toggle(id ?? "");
                  toast(isWishlisted ? "Removed from wishlist" : "Saved to wishlist", {
                    icon: isWishlisted ? "🗑️" : "❤️",
                  });
                }}
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                  isWishlisted
                    ? "border-red-500/40 bg-red-500/10 text-red-400"
                    : "border-stroke text-ink3 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
                }`}
                aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
              >
                <HeartIcon className="size-5" filled={isWishlisted} />
              </button>
            </div>

            {!p.availability && (
              <p className="text-sm text-amber-300/90">This item is currently out of stock.</p>
            )}
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {trustBadges.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-xs text-ink4">
                <Icon className="size-3.5 shrink-0 text-ink3" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* You may also like */}
      {(relatedQuery.isPending || (relatedQuery.data && relatedQuery.data.length > 0)) && (
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="border-t border-stroke pt-12"
        >
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">More like this</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-ink">You may also like</h2>
          </div>
          {relatedQuery.isPending ? (
            <ProductSkeletonGrid count={4} />
          ) : (
            <motion.div
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-40px" }}
            >
              {relatedQuery.data?.map((rp) => (
                <motion.div key={rp.product_id} variants={cardFade}>
                  <ProductCard product={rp} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.section>
      )}

      {/* Reviews */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="space-y-6 border-t border-stroke pt-8"
      >
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-xl font-bold text-ink">Customer reviews</h2>
          {reviewsQuery.data && reviewsQuery.data.length > 0 && (
            <p className="text-sm text-ink4">
              {reviewsQuery.data.length} review{reviewsQuery.data.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {!user ? (
          <div className="rounded-2xl border border-stroke bg-card p-6 text-center">
            <p className="text-ink4">
              <Link to="/login" className="font-medium text-emerald-400 transition-colors hover:text-emerald-300">Sign in</Link>{" "}
              to read and write reviews.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {reviewsQuery.isPending ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 animate-pulse rounded-2xl bg-well" />
                ))}
              </div>
            ) : reviewsQuery.data?.length ? (
              <ul className="space-y-3">
                {reviewsQuery.data.map((r) => (
                  <li key={r.id} className="rounded-2xl border border-stroke bg-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-well text-sm font-semibold text-ink2">
                          {(r.user?.name ?? "C")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink">{r.user?.name ?? "Customer"}</p>
                          <p className="text-xs text-ink4">
                            {new Date(r.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span key={n} className={`text-sm ${n <= r.rating ? "text-amber-400" : "text-ink4"}`}>★</span>
                        ))}
                      </div>
                    </div>
                    {r.content && <p className="mt-3 text-sm leading-relaxed text-ink3">{r.content}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-stroke bg-card p-8 text-center">
                <p className="text-ink4">No reviews yet — be the first to leave one.</p>
              </div>
            )}

            <form
              className="space-y-5 rounded-2xl border border-stroke bg-card p-6"
              onSubmit={(e) => { e.preventDefault(); reviewMutation.mutate(); }}
            >
              <h3 className="font-display text-base font-semibold text-ink">Write a review</h3>
              {formError && (
                <div className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3">
                  <p className="text-sm text-red-300">{formError}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-ink3">Your rating</label>
                <StarRating value={rating} onChange={setRating} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-ink3">
                  Comment <span className="font-normal text-ink4">(optional)</span>
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={3}
                  placeholder="Share your thoughts about this product…"
                  className="w-full resize-none rounded-xl border border-stroke bg-input px-4 py-3 text-sm text-ink placeholder:text-ink4 transition focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
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
      </motion.section>
    </motion.div>
  );
}
