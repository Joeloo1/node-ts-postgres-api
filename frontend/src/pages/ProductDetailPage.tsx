import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { ApiError } from "../lib/api";
import { productImageUrl } from "../lib/productImage";
import { queryKeys } from "../lib/queryKeys";
import * as productService from "../services/products";
import * as reviewService from "../services/reviews";
import { useCartMutations } from "../hooks/useCartMutations";
import { ProductDetailSkeleton, ProductSkeletonGrid } from "../components/ProductSkeleton";
import { ProductCard } from "../components/ProductCard";
import { ProductGallery } from "../components/ProductGallery";
import { ShareProduct } from "../components/ShareProduct";
import { BackInStockNotify } from "../components/BackInStockNotify";
import { trackRecentlyViewed, useRecentlyViewed } from "../hooks/useRecentlyViewed";
import type { Review } from "../lib/types";
import {
  CartIcon, CheckIcon, ChevronRightIcon,
  HeartIcon, MinusIcon, PackageIcon, PhoneIcon,
  PlusIcon, ShieldIcon, TruckIcon,
} from "../components/Icons";
import { useEffect } from "react";

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          className={`text-xl leading-none transition-transform hover:scale-110 ${n <= display ? "text-amber-400" : "text-ink4"}`}
          aria-label={`Rate ${n} star${n !== 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
      <span className="ml-1.5 text-xs text-ink4">{value}/5</span>
    </div>
  );
}

function DisplayStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`text-sm leading-none ${n <= Math.round(rating) ? "text-amber-400" : "text-ink4"}`}>★</span>
      ))}
    </div>
  );
}

function RatingBreakdown({ reviews }: { reviews: Review[] }) {
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const counts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const max = Math.max(...counts.map((c) => c.count), 1);

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-stroke bg-card p-5 sm:flex-row">
      <div className="flex shrink-0 flex-col items-center justify-center gap-1 sm:border-r sm:border-stroke sm:pr-5">
        <p className="text-4xl font-bold tabular-nums text-ink">{avg.toFixed(1)}</p>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={`text-sm leading-none ${n <= Math.round(avg) ? "text-amber-400" : "text-ink4"}`}>★</span>
          ))}
        </div>
        <p className="mt-1 text-xs text-ink4">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="flex-1 space-y-1.5">
        {counts.map(({ star, count }) => (
          <div key={star} className="flex items-center gap-2">
            <span className="w-3 shrink-0 text-right text-[11px] font-semibold text-ink3">{star}</span>
            <span className="text-[11px] leading-none text-amber-400">★</span>
            <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-well">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-500"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-ink4">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.25, 0.1, 0.25, 1] } },
};
const stagger: Variants  = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const cardFade: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
};

const trustBadges = [
  { icon: TruckIcon,   text: "Free shipping over $50" },
  { icon: PackageIcon, text: "30-day returns" },
  { icon: ShieldIcon,  text: "Secure checkout" },
  { icon: PhoneIcon,   text: "24/7 support" },
];

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toggle, has } = useWishlist();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addItem } = useCartMutations();
  const [qty, setQty] = useState(1);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "reviews">("overview");
  const [reviewSort, setReviewSort] = useState<"newest" | "highest" | "lowest">("newest");
  /* Fix #29 — initialise as null, only render when we have a real observation */
  const [showStickyBar, setShowStickyBar] = useState<boolean | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const reviewsTabRef = useRef<HTMLButtonElement>(null);
  const isWishlisted = has(id ?? "");

  const productQuery = useQuery({
    queryKey: queryKeys.product(id!),
    queryFn: () => productService.getProduct(id!),
    enabled: Boolean(id),
  });

  const reviewsQuery = useQuery({
    queryKey: queryKeys.reviews(id!),
    queryFn: () => reviewService.getReviews(id!),
    enabled: Boolean(id),
  });

  const p = productQuery.data;
  usePageTitle(p?.name ?? "Product");

  const { products: recentlyViewed } = useRecentlyViewed(id);

  useEffect(() => {
    if (p?.product_id) trackRecentlyViewed(p.product_id);
  }, [p?.product_id]);

  useEffect(() => {
    const el = actionsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-70px 0px 0px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [p?.product_id]);

  const relatedQuery = useQuery({
    queryKey: [...queryKeys.products(), "related", p?.category_id, id],
    queryFn: () => productService.getRelated(p!.category_id!, id!),
    enabled: Boolean(p?.category_id),
  });

  const sortedReviews = useMemo(() => {
    if (!reviewsQuery.data) return [];
    return [...reviewsQuery.data].sort((a, b) => {
      if (reviewSort === "newest")  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (reviewSort === "highest") return b.rating - a.rating;
      return a.rating - b.rating;
    });
  }, [reviewsQuery.data, reviewSort]);

  const gallery = useMemo(() => {
    if (!p) return [];
    const imgs = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
    if (p.image && !imgs.includes(p.image)) imgs.unshift(p.image);
    return imgs.length ? imgs : [productImageUrl(p)];
  }, [p?.product_id]);

  const reviewMutation = useMutation({
    mutationFn: () =>
      reviewService.createReview({
        product_id: id!,
        rating,
        content: reviewText.trim() || undefined,
      }),
    onSuccess: () => {
      setFormError(null);
      setReviewText("");
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews(id!) });
      toast.success("Review submitted");
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : "Could not submit review";
      setFormError(msg);
      toast.error(msg);
    },
  });

  function handleAddToCart() {
    if (!user) { navigate("/login", { state: { from: `/products/${id}` } }); return; }
    addItem.mutate(
      { productId: id!, quantity: qty },
      {
        onSuccess: () => {
          setAddedToCart(true);
          setTimeout(() => setAddedToCart(false), 2500);
        },
      },
    );
  }

  function scrollToReviews() {
    setActiveTab("reviews");
    setTimeout(() => reviewsTabRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  if (productQuery.isPending) return <ProductDetailSkeleton />;

  if (productQuery.isError || !p) {
    return (
      <div className="rounded-xl border border-stroke p-10 text-center">
        <p className="text-ink3">Product not found.</p>
        <Link to="/products" className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400">
          Back to shop
        </Link>
      </div>
    );
  }

  const displayPrice = p.discount && p.discount > 0 ? p.price * (1 - p.discount / 100) : p.price;
  const categoryName = p.category && "name" in p.category ? p.category.name : null;

  return (
    <>
      {/* Sticky add-to-cart bar (with qty) */}
      <AnimatePresence>
        {showStickyBar === true && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed top-[64px] left-0 right-0 z-30 border-b border-stroke bg-page/95 backdrop-blur-md shadow-sm"
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                <p className="text-xs text-ink4">${displayPrice.toFixed(2)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {p.availability && (
                  <div className="flex items-center overflow-hidden rounded-lg border border-stroke bg-input">
                    <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-2.5 py-1.5 text-ink3 transition-colors hover:text-ink">
                      <MinusIcon className="size-3.5" />
                    </button>
                    <span className="w-8 select-none text-center text-sm font-semibold text-ink">{qty}</span>
                    <button type="button" onClick={() => setQty((q) => Math.min(99, q + 1))} className="px-2.5 py-1.5 text-ink3 transition-colors hover:text-ink">
                      <PlusIcon className="size-3.5" />
                    </button>
                  </div>
                )}
                {p.availability ? (
                  <button
                    type="button"
                    disabled={addItem.isPending}
                    onClick={handleAddToCart}
                    className={`shrink-0 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50 ${addedToCart ? "bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                  >
                    {addedToCart ? "Added ✓" : addItem.isPending ? "Adding…" : "Add to cart"}
                  </button>
                ) : (
                  <span className="shrink-0 rounded-xl border border-stroke px-5 py-2 text-sm font-medium text-ink4">
                    Out of stock
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div className="space-y-20" variants={stagger} initial="hidden" animate="show">

        <motion.nav variants={fadeUp} className="flex items-center gap-1.5 text-xs text-ink4" aria-label="Breadcrumb">
          <Link to="/" className="transition-colors hover:text-ink2">Home</Link>
          <ChevronRightIcon className="size-3 text-ink4" />
          <Link to="/products" className="transition-colors hover:text-ink2">Shop</Link>
          <ChevronRightIcon className="size-3 text-ink4" />
          <span className="line-clamp-1 text-ink3">{p.name}</span>
        </motion.nav>

        <motion.div variants={fadeUp} className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <ProductGallery gallery={gallery} productName={p.name} />

          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {categoryName && (
                <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">
                  {categoryName}
                </span>
              )}
              {p.availability ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  In stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-stroke bg-well px-2.5 py-0.5 text-xs font-semibold text-ink3">
                  Out of stock
                </span>
              )}
              {p.stock !== undefined && p.stock > 0 && p.stock < 10 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  Only {p.stock} left
                </span>
              )}
            </div>

            <div>
              <h1 className="font-display text-3xl font-bold leading-tight tracking-[-0.01em] text-ink sm:text-4xl">{p.name}</h1>
              {p.brand && <p className="mt-1.5 text-sm text-ink4">by {p.brand}</p>}
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold tabular-nums text-ink">${displayPrice.toFixed(2)}</span>
              {p.discount && p.discount > 0 ? (
                <>
                  <span className="text-lg tabular-nums text-ink4 line-through">${p.price.toFixed(2)}</span>
                  <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    −{Math.round(p.discount)}%
                  </span>
                </>
              ) : null}
            </div>

            {/* Clickable rating → scrolls to reviews tab */}
            {p.rating != null && (
              <button type="button" onClick={scrollToReviews} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <DisplayStars rating={p.rating} />
                <span className="text-sm font-semibold tabular-nums text-amber-500">{p.rating.toFixed(1)}</span>
                <span className="text-xs text-ink4">/ 5.0</span>
                {reviewsQuery.data && (
                  <span className="text-xs text-ink4">({reviewsQuery.data.length} review{reviewsQuery.data.length !== 1 ? "s" : ""})</span>
                )}
              </button>
            )}

            {p.description && (
              <p className="text-[15px] leading-[1.7] text-ink3">{p.description}</p>
            )}

            <div ref={actionsRef} className="space-y-4 border-t border-stroke pt-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center overflow-hidden rounded-lg border border-stroke bg-input">
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
                    disabled={!p.availability || addItem.isPending}
                    onClick={handleAddToCart}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all disabled:opacity-50 sm:flex-none ${
                      addedToCart ? "bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/15"
                    }`}
                  >
                    {addedToCart ? <><CheckIcon className="size-4" />Added to cart</> : addItem.isPending ? "Adding…" : <><CartIcon className="size-4" />Add to cart</>}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("/login", { state: { from: `/products/${id}` } })}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-stroke bg-card px-6 py-3 text-sm font-semibold text-ink2 transition-colors hover:bg-raised sm:flex-none"
                  >
                    Sign in to purchase
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    toggle(id ?? "");
                    toast(isWishlisted ? "Removed from wishlist" : "Saved to wishlist", { icon: isWishlisted ? "🗑️" : "❤️" });
                  }}
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                    isWishlisted
                      ? "border-red-500/30 bg-red-500/10 text-red-500"
                      : "border-stroke text-ink3 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500"
                  }`}
                  aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
                >
                  <HeartIcon className="size-5" filled={isWishlisted} />
                </button>
              </div>

              {!p.availability && <BackInStockNotify productName={p.name} />}
            </div>

            {/* Merged share button — UI fix #12 */}
            <ShareProduct name={p.name} />

            <div className="grid grid-cols-2 gap-2.5 border-t border-stroke pt-5">
              {trustBadges.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-xs text-ink4">
                  <Icon className="size-3.5 shrink-0 text-ink3" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Related products */}
        {(relatedQuery.isPending || (relatedQuery.data && relatedQuery.data.length > 0)) && (
          <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} className="border-t border-stroke pt-12">
            <h2 className="mb-7 font-display text-2xl font-bold text-ink">You may also like</h2>
            {relatedQuery.isPending ? (
              <ProductSkeletonGrid count={4} />
            ) : (
              <motion.div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
                {relatedQuery.data?.map((rp) => (
                  <motion.div key={rp.product_id} variants={cardFade}><ProductCard product={rp} /></motion.div>
                ))}
              </motion.div>
            )}
          </motion.section>
        )}

        {/* Overview + Reviews tabs */}
        <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} className="space-y-0 border-t border-stroke pt-10">
          <div className="flex border-b border-stroke">
            {(["overview", "reviews"] as const).map((tab) => (
              <button
                key={tab}
                ref={tab === "reviews" ? reviewsTabRef : undefined}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-emerald-500 text-ink"
                    : "border-transparent text-ink3 hover:text-ink"
                }`}
              >
                {tab === "reviews"
                  ? `Reviews${reviewsQuery.data ? ` (${reviewsQuery.data.length})` : ""}`
                  : "Overview"}
              </button>
            ))}
          </div>

          <div className="pt-6 space-y-6">
            {activeTab === "overview" && p.description && (
              <div className="prose max-w-none">
                <p className="text-[15px] leading-[1.8] text-ink3 whitespace-pre-line">{p.description}</p>
              </div>
            )}
            {activeTab === "overview" && !p.description && (
              <p className="text-sm text-ink4">No product description available.</p>
            )}

            {activeTab === "reviews" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-display text-2xl font-bold text-ink">Customer reviews</h2>
                  {reviewsQuery.data && reviewsQuery.data.length > 1 && (
                    <div className="relative">
                      <select
                        value={reviewSort}
                        onChange={(e) => setReviewSort(e.target.value as typeof reviewSort)}
                        className="appearance-none rounded-lg border border-stroke bg-raised py-1.5 pl-3 pr-8 text-[12px] font-medium text-ink2 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 cursor-pointer hover:border-edge transition-colors"
                      >
                        <option value="newest">Newest first</option>
                        <option value="highest">Highest rated</option>
                        <option value="lowest">Lowest rated</option>
                      </select>
                      <svg className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-ink4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>
                  )}
                </div>

                {reviewsQuery.isPending ? (
                  <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-24 animate-shimmer rounded-xl" />)}</div>
                ) : reviewsQuery.data?.length ? (
                  <>
                    <RatingBreakdown reviews={reviewsQuery.data} />
                  <ul className="space-y-3">
                    {sortedReviews.map((r: Review) => (
                      <li key={r.id} className="rounded-xl border border-stroke bg-card p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-full bg-well text-sm font-semibold text-ink2">
                              {(r.user?.name ?? "C")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-ink">{r.user?.name ?? "Customer"}</p>
                              <p className="text-[11px] text-ink4">
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
                        {r.content && <p className="mt-3 text-[14px] leading-relaxed text-ink3">{r.content}</p>}
                      </li>
                    ))}
                  </ul>
                  </>
                ) : (
                  <div className="rounded-xl border border-stroke bg-card p-8 text-center">
                    <p className="text-sm text-ink4">No reviews yet — be the first to leave one.</p>
                  </div>
                )}

                {/* Review form — UI fix #17: submit button is now primary green */}
                {user ? (
                  <form
                    className="space-y-5 rounded-xl border border-stroke bg-card p-6"
                    onSubmit={(e) => { e.preventDefault(); reviewMutation.mutate(); }}
                  >
                    <h3 className="font-display text-base font-semibold text-ink">Write a review</h3>
                    {formError && (
                      <div className="rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-3">
                        <p className="text-sm text-red-400">{formError}</p>
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
                        className="w-full resize-none rounded-lg border border-stroke bg-input px-4 py-3 text-sm text-ink placeholder:text-ink4 transition focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={reviewMutation.isPending}
                      className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {reviewMutation.isPending ? "Submitting…" : "Submit review"}
                    </button>
                  </form>
                ) : (
                  <div className="rounded-xl border border-stroke bg-card p-6 text-center">
                    <p className="text-sm text-ink4">
                      <Link to="/login" className="font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400">Sign in</Link>{" "}
                      to write a review.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.section>

        {/* Recently viewed */}
        {recentlyViewed.length > 0 && (
          <motion.section
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
            className="border-t border-stroke pt-12"
          >
            <h2 className="mb-7 font-display text-2xl font-bold text-ink">Recently viewed</h2>
            <motion.div
              className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"
              variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
            >
              {recentlyViewed.map((rp) => (
                <motion.div key={rp.product_id} variants={cardFade}>
                  <ProductCard product={rp} />
                </motion.div>
              ))}
            </motion.div>
          </motion.section>
        )}
      </motion.div>
    </>
  );
}
