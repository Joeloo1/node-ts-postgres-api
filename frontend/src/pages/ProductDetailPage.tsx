import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
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
import * as variantService from "../services/variants";
import * as questionService from "../services/questions";
import * as priceHistoryService from "../services/priceHistory";
import { useCartMutations } from "../hooks/useCartMutations";
import { ProductDetailSkeleton, ProductSkeletonGrid } from "../components/ProductSkeleton";
import { ProductCard } from "../components/ProductCard";
import { ProductGallery } from "../components/ProductGallery";
import { ShareProduct } from "../components/ShareProduct";
import { BackInStockNotify } from "../components/BackInStockNotify";
import { trackRecentlyViewed, useRecentlyViewed } from "../hooks/useRecentlyViewed";
import type { ProductVariant, ProductQuestion, PriceHistoryPoint, Review } from "../lib/types";
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

function isNewProduct(createdAt?: string) {
  return !!createdAt && Date.now() - new Date(createdAt).getTime() < 14 * 24 * 60 * 60 * 1_000;
}

function PriceSparkline({ history }: { history: PriceHistoryPoint[] }) {
  if (history.length < 2) return null;
  const prices = history.map((h) => h.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const W = 260, H = 56, pad = 4;
  const points = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * (W - pad * 2);
    const y = pad + ((max - p) / range) * (H - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  const current = prices[prices.length - 1];
  const first   = prices[0];
  const trend   = current >= first ? "up" : "down";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink4">Price history</h3>
        <span className={`text-xs font-semibold ${trend === "up" ? "text-red-400" : "text-emerald-500"}`}>
          {trend === "up" ? "▲" : "▼"} ${Math.abs(current - first).toFixed(2)} vs first recorded
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-stroke bg-card p-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
          <polyline
            points={points}
            fill="none"
            stroke={trend === "up" ? "#f87171" : "#10b981"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="mt-2 flex items-center justify-between text-[10px] tabular-nums text-ink4">
          <span>${min.toFixed(2)} low</span>
          <span className="font-semibold text-ink">${current.toFixed(2)} now</span>
          <span>${max.toFixed(2)} high</span>
        </div>
      </div>
    </div>
  );
}

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
  const [buyingNow, setBuyingNow] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "reviews" | "qa">("overview");
  const [reviewSort, setReviewSort] = useState<"newest" | "highest" | "lowest">("newest");
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaAnswers, setQaAnswers] = useState<Record<string, string>>({});
  const [qaFormError, setQaFormError] = useState<string | null>(null);
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

  const variantsQuery = useQuery({
    queryKey: queryKeys.variants(id!),
    queryFn: () => variantService.getVariants(id!),
    enabled: Boolean(id),
  });

  const questionsQuery = useQuery({
    queryKey: queryKeys.questions(id!),
    queryFn: () => questionService.getQuestions(id!),
    enabled: Boolean(id),
  });

  const priceHistoryQuery = useQuery({
    queryKey: queryKeys.priceHistory(id!),
    queryFn: () => priceHistoryService.getPriceHistory(id!),
    enabled: Boolean(id),
  });

  const fbtQuery = useQuery({
    queryKey: queryKeys.frequentlyBoughtTogether(id!),
    queryFn: () => productService.getFrequentlyBoughtTogether(id!, 4),
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
      { threshold: 0, rootMargin: "-120px 0px 0px 0px" },
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

  const userReview = useMemo(
    () => (user && reviewsQuery.data ? (reviewsQuery.data.find((r) => r.userId === user.id) ?? null) : null),
    [user, reviewsQuery.data],
  );

  const gallery = useMemo(() => {
    if (!p) return [];
    const imgs = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
    if (p.image && !imgs.includes(p.image)) imgs.unshift(p.image);
    return imgs.length ? imgs : [productImageUrl(p)];
  }, [p]);

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
      const msg =
        e instanceof ApiError && e.status === 403
          ? "You must purchase and receive this product before leaving a review."
          : e instanceof ApiError
          ? e.message
          : "Could not submit review";
      setFormError(msg);
      toast.error(msg);
    },
  });

  const voteMutation = useMutation({
    mutationFn: ({ reviewId, helpful }: { reviewId: string; helpful: boolean }) =>
      reviewService.voteReview(reviewId, helpful),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.reviews(id!) }),
  });

  const questionMutation = useMutation({
    mutationFn: (question: string) => questionService.createQuestion(id!, question),
    onSuccess: () => {
      setQaQuestion("");
      setQaFormError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.questions(id!) });
      toast.success("Question submitted");
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : "Could not submit question";
      setQaFormError(msg);
    },
  });

  const answerMutation = useMutation({
    mutationFn: ({ questionId, answer }: { questionId: string; answer: string }) =>
      questionService.answerQuestion(questionId, answer),
    onSuccess: (_data, { questionId }) => {
      setQaAnswers((prev) => ({ ...prev, [questionId]: "" }));
      queryClient.invalidateQueries({ queryKey: queryKeys.questions(id!) });
      toast.success("Answer submitted");
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (questionId: string) => questionService.deleteQuestion(questionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.questions(id!) }),
  });

  function handleAddToCart() {
    if (!user) { navigate("/login", { state: { from: `/products/${id}` } }); return; }
    addItem.mutate(
      { productId: id!, quantity: qty },
      {
        onSuccess: () => {
          setAddedToCart(true);
          setTimeout(() => setAddedToCart(false), 2500);
          const label = (p?.name ?? "Item").slice(0, 30) + ((p?.name?.length ?? 0) > 30 ? "…" : "");
          toast.success(`${label} added to cart`, {
            action: { label: "View cart", onClick: () => navigate("/cart") },
          });
        },
      },
    );
  }

  function handleBuyNow() {
    if (!user) { navigate("/login", { state: { from: `/products/${id}` } }); return; }
    setBuyingNow(true);
    addItem.mutate(
      { productId: id!, quantity: qty },
      {
        onSuccess: () => navigate("/checkout"),
        onError: () => setBuyingNow(false),
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
      <div className="flex flex-col items-center justify-center gap-5 rounded-xl border border-stroke bg-card px-6 py-20 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-well">
          <PackageIcon className="size-8 text-ink4" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Product not found</h2>
          <p className="mt-1.5 text-sm text-ink4">This product may have been removed or the link is incorrect.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => productQuery.refetch()}
            className="rounded-lg border border-stroke bg-raised px-4 py-2 text-sm font-medium text-ink2 transition-colors hover:bg-card"
          >
            Try again
          </button>
          <Link
            to="/products"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Back to shop
          </Link>
        </div>
      </div>
    );
  }

  const basePrice = p.discount && p.discount > 0 ? p.price * (1 - p.discount / 100) : p.price;
  const selectedVariant = variantsQuery.data?.find((v) => v.id === selectedVariantId) ?? null;
  const displayPrice = selectedVariant ? basePrice + selectedVariant.priceModifier : basePrice;
  const effectiveStock = selectedVariant ? selectedVariant.stock : (p.stock ?? 99);
  const isAvailable = selectedVariant ? selectedVariant.availability : p.availability;
  const categoryName = p.category && "name" in p.category ? p.category.name : null;
  const ogImage = productImageUrl(p);
  const ogDescription = p.description
    ? p.description.slice(0, 160)
    : `${p.name}${categoryName ? ` — ${categoryName}` : ""}. Shop now at Northline.`;
  const canonicalUrl = `${window.location.origin}/products/${p.product_id}`;

  return (
    <>
      <Helmet>
        <title>{p.name} — Northline</title>
        <meta name="description" content={ogDescription} />
        <link rel="canonical" href={canonicalUrl} />
        {/* Open Graph */}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={`${p.name} — Northline`} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="Northline" />
        {p.price != null && <meta property="product:price:amount" content={displayPrice.toFixed(2)} />}
        <meta property="product:price:currency" content="USD" />
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${p.name} — Northline`} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>

      {/* Sticky add-to-cart bar (with qty) */}
      <AnimatePresence>
        {showStickyBar === true && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed top-[64px] left-0 right-0 z-30 border-b border-stroke bg-page/95 backdrop-blur-md shadow-sm md:top-[109px]"
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                <p className="text-xs text-ink4">${displayPrice.toFixed(2)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {isAvailable && (
                  <div className="flex items-center overflow-hidden rounded-lg border border-stroke bg-input">
                    <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-2.5 py-1.5 text-ink3 transition-colors hover:text-ink">
                      <MinusIcon className="size-3.5" />
                    </button>
                    <span className="w-8 select-none text-center text-sm font-semibold text-ink">{qty}</span>
                    <button type="button" onClick={() => setQty((q) => Math.min(effectiveStock, q + 1))} disabled={qty >= effectiveStock} className="px-2.5 py-1.5 text-ink3 transition-colors hover:text-ink disabled:opacity-40">
                      <PlusIcon className="size-3.5" />
                    </button>
                  </div>
                )}
                {isAvailable ? (
                  <>
                    <button
                      type="button"
                      disabled={addItem.isPending || buyingNow}
                      onClick={handleBuyNow}
                      className="hidden shrink-0 items-center justify-center rounded-xl border border-emerald-600 bg-transparent px-4 py-2 text-sm font-semibold text-emerald-600 transition-all hover:bg-emerald-600 hover:text-white disabled:opacity-50 sm:flex dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-white"
                    >
                      {buyingNow ? "Redirecting…" : "Buy now"}
                    </button>
                    <button
                      type="button"
                      disabled={addItem.isPending || buyingNow}
                      onClick={handleAddToCart}
                      className={`relative shrink-0 overflow-hidden rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-50 ${addedToCart ? "bg-emerald-500 shadow-emerald-500/20" : "bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-500 hover:shadow-emerald-500/30"}`}
                    >
                      {!addedToCart && !addItem.isPending && !buyingNow && (
                        <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
                      )}
                      {addedToCart ? "Added ✓" : addItem.isPending && !buyingNow ? "Adding…" : "Add to cart"}
                    </button>
                  </>
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

        {/* Breadcrumb + buy area share tight spacing; big gaps separate major sections */}
        <div className="space-y-5">
        <motion.nav variants={fadeUp} className="flex items-center gap-1.5 text-xs text-ink4" aria-label="Breadcrumb">
          <Link to="/" className="transition-colors hover:text-ink2">Home</Link>
          <ChevronRightIcon className="size-3 text-ink4" />
          <Link to="/products" className="transition-colors hover:text-ink2">Shop</Link>
          {categoryName && p.category_id && (
            <>
              <ChevronRightIcon className="size-3 text-ink4" />
              <Link to={`/categories/${p.category_id}`} className="transition-colors hover:text-ink2">
                {categoryName}
              </Link>
            </>
          )}
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
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                  <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Only {p.stock} left
                </span>
              )}
              {isNewProduct(p.createdAt) && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-400">
                  New
                </span>
              )}
            </div>

            <div>
              <h1 className="font-display text-3xl font-bold leading-tight tracking-[-0.01em] text-ink sm:text-4xl">{p.name}</h1>
              {p.brand && <p className="mt-1.5 text-sm text-ink4">by {p.brand}</p>}
            </div>

            {/* Clickable rating → scrolls to reviews tab (social proof above price) */}
            {p.rating != null && (
              <button type="button" onClick={scrollToReviews} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <DisplayStars rating={p.rating} />
                <span className="text-sm font-semibold tabular-nums text-amber-500">{p.rating.toFixed(1)}</span>
                <span className="text-xs text-ink4">/ 5.0</span>
                {reviewsQuery.data && (
                  <span className="text-xs text-ink4 underline-offset-2 hover:underline">
                    ({reviewsQuery.data.length} review{reviewsQuery.data.length !== 1 ? "s" : ""})
                  </span>
                )}
              </button>
            )}

            <div className="space-y-1">
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
              {p.discount && p.discount > 0 && (
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  You save ${(p.price - displayPrice).toFixed(2)}
                </p>
              )}
            </div>

            {p.description && (
              <p className="line-clamp-4 text-[15px] leading-[1.7] text-ink3">{p.description}</p>
            )}

            {/* Variant selector */}
            {variantsQuery.data && variantsQuery.data.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-ink3">
                  Option{" "}
                  {selectedVariant && (
                    <span className="font-semibold text-ink">— {selectedVariant.name}</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {variantsQuery.data.map((v: ProductVariant) => {
                    const isSelected = selectedVariantId === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={!v.availability}
                        onClick={() => { setSelectedVariantId(isSelected ? null : v.id); setQty(1); }}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-stroke bg-card text-ink2 hover:border-edge"
                        }`}
                      >
                        {v.name}
                        {v.priceModifier !== 0 && (
                          <span className="ml-1 opacity-70">
                            ({v.priceModifier > 0 ? "+" : ""}${v.priceModifier.toFixed(2)})
                          </span>
                        )}
                        {v.stock > 0 && v.stock <= 3 && (
                          <span className="ml-1 text-amber-500">· {v.stock} left</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedVariant && selectedVariant.priceModifier !== 0 && (
                  <p className="text-xs text-ink4">
                    Price with option: <span className="font-semibold text-ink">${displayPrice.toFixed(2)}</span>
                  </p>
                )}
              </div>
            )}

            <div ref={actionsRef} className="space-y-4 border-t border-stroke pt-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center overflow-hidden rounded-lg border border-stroke bg-input">
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2.5 text-ink3 transition-colors hover:text-ink" aria-label="Decrease quantity">
                    <MinusIcon className="size-4" />
                  </button>
                  <span className="w-10 select-none text-center text-sm font-semibold text-ink">{qty}</span>
                  <button type="button" onClick={() => setQty((q) => Math.min(effectiveStock, q + 1))} className="px-3 py-2.5 text-ink3 transition-colors hover:text-ink disabled:opacity-40" aria-label="Increase quantity" disabled={effectiveStock != null && qty >= effectiveStock}>
                    <PlusIcon className="size-4" />
                  </button>
                </div>

                {user ? (
                  <>
                    <button
                      type="button"
                      disabled={!isAvailable || addItem.isPending || buyingNow}
                      onClick={handleAddToCart}
                      className={`relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all active:scale-[0.97] disabled:opacity-50 sm:flex-none ${
                        addedToCart ? "bg-emerald-500 shadow-emerald-500/25" : "bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-500 hover:shadow-emerald-500/35"
                      }`}
                    >
                      {!addedToCart && !addItem.isPending && (
                        <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
                      )}
                      {addedToCart ? <><CheckIcon className="size-4" />Added to cart</> : addItem.isPending && !buyingNow ? "Adding…" : <><CartIcon className="size-4" />Add to cart</>}
                    </button>
                    {isAvailable && (
                      <button
                        type="button"
                        disabled={addItem.isPending || buyingNow}
                        onClick={handleBuyNow}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-transparent px-6 py-3 text-sm font-semibold text-emerald-600 transition-all hover:bg-emerald-600 hover:text-white disabled:opacity-50 sm:flex-none dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-white"
                      >
                        {buyingNow ? "Redirecting…" : "Buy now"}
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("/login", { state: { from: `/products/${id}` } })}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-stroke bg-card px-6 py-3 text-sm font-semibold text-ink2 transition-colors hover:bg-raised sm:flex-none"
                  >
                    Sign in to purchase
                  </button>
                )}

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.85 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => {
                    toggle(id ?? "");
                    toast(isWishlisted ? "Removed from wishlist" : "Saved to wishlist", {
                      icon: isWishlisted
                        ? <svg className="size-4 text-ink4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        : <svg className="size-4 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>,
                    });
                  }}
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                    isWishlisted
                      ? "border-red-500/30 bg-red-500/10 text-red-500"
                      : "border-stroke text-ink3 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500"
                  }`}
                  aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
                >
                  <motion.div
                    key={isWishlisted ? "active" : "inactive"}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <HeartIcon className="size-5" filled={isWishlisted} />
                  </motion.div>
                </motion.button>
              </div>

              {!isAvailable && <BackInStockNotify productId={p.product_id} productName={p.name} />}
            </div>

            {/* Merged share button — UI fix #12 */}
            <ShareProduct name={p.name} price={`$${displayPrice.toFixed(2)}`} />

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
        </div>

        {/* Overview + Reviews tabs */}
        <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} className="space-y-0 border-t border-stroke pt-10">
          <div className="flex border-b border-stroke">
            {(["overview", "reviews", "qa"] as const).map((tab) => (
              <button
                key={tab}
                ref={tab === "reviews" ? reviewsTabRef : undefined}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-emerald-500 text-ink"
                    : "border-transparent text-ink3 hover:text-ink"
                }`}
              >
                {tab === "reviews"
                  ? `Reviews${reviewsQuery.data ? ` (${reviewsQuery.data.length})` : ""}`
                  : tab === "qa"
                  ? `Q&A${questionsQuery.data ? ` (${questionsQuery.data.questions.length})` : ""}`
                  : "Overview"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="pt-6 space-y-6"
          >
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Specs table */}
                <div className="overflow-hidden rounded-xl border border-stroke">
                  {[
                    { label: "Brand",        value: p.brand },
                    { label: "Category",     value: categoryName },
                    { label: "Unit",         value: p.unit },
                    { label: "Availability", value: p.availability ? "In stock" : "Out of stock" },
                    { label: "Stock",        value: p.stock != null ? String(p.stock) : null },
                  ].filter((r) => r.value != null).map(({ label, value }, i, arr) => (
                    <div key={label} className={`flex items-center gap-4 px-5 py-3.5 ${i < arr.length - 1 ? "border-b border-stroke" : ""} ${i % 2 === 0 ? "bg-card" : "bg-raised"}`}>
                      <span className="w-28 shrink-0 text-[11px] font-bold uppercase tracking-widest text-ink4">{label}</span>
                      <span className={`text-sm font-medium ${label === "Availability" ? (p.availability ? "text-emerald-600 dark:text-emerald-400" : "text-red-400") : "text-ink"}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Description below specs if present */}
                {p.description && (
                  <div>
                    <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink4">Description</h3>
                    <p className="text-[15px] leading-[1.8] text-ink3 whitespace-pre-line">{p.description}</p>
                  </div>
                )}
                {/* Price history sparkline */}
                {priceHistoryQuery.data && priceHistoryQuery.data.length > 1 && (
                  <PriceSparkline history={priceHistoryQuery.data} />
                )}
              </div>
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
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-ink">{r.user?.name ?? "Customer"}</p>
                                {r.verifiedPurchase && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    <svg className="size-2.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                                    </svg>
                                    Verified purchase
                                  </span>
                                )}
                              </div>
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
                        {/* Helpful votes */}
                        {user && r.userId !== user.id && (() => {
                          const helpfulCount = r.votes?.filter((v) => v.helpful).length ?? 0;
                          const notHelpfulCount = r.votes?.filter((v) => !v.helpful).length ?? 0;
                          return (
                            <div className="mt-3 flex items-center gap-2 border-t border-stroke pt-3">
                              <span className="text-[11px] text-ink4">Was this helpful?</span>
                              <button
                                type="button"
                                onClick={() => voteMutation.mutate({ reviewId: r.id, helpful: true })}
                                aria-label="Mark review as helpful"
                                className="flex items-center gap-1.5 rounded-md border border-stroke px-2 py-1 text-[11px] font-medium tabular-nums text-ink3 transition-colors hover:border-emerald-500/40 hover:text-emerald-600"
                              >
                                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V2.75a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904m1.5-9.75v9.75m-1.5-9.75H4.875c-.621 0-1.125.504-1.125 1.125v7.5c0 .621.504 1.125 1.125 1.125H5.904" />
                                </svg>
                                {helpfulCount > 0 && helpfulCount}
                              </button>
                              <button
                                type="button"
                                onClick={() => voteMutation.mutate({ reviewId: r.id, helpful: false })}
                                aria-label="Mark review as not helpful"
                                className="flex items-center gap-1.5 rounded-md border border-stroke px-2 py-1 text-[11px] font-medium tabular-nums text-ink3 transition-colors hover:border-red-400/40 hover:text-red-400"
                              >
                                <svg className="size-3.5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V2.75a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904m1.5-9.75v9.75m-1.5-9.75H4.875c-.621 0-1.125.504-1.125 1.125v7.5c0 .621.504 1.125 1.125 1.125H5.904" />
                                </svg>
                                {notHelpfulCount > 0 && notHelpfulCount}
                              </button>
                            </div>
                          );
                        })()}
                      </li>
                    ))}
                  </ul>
                  </>
                ) : (
                  <div className="rounded-xl border border-stroke bg-card p-8 text-center">
                    <p className="text-sm text-ink4">No reviews yet — be the first to leave one.</p>
                  </div>
                )}

                {/* Review form */}
                {!user ? (
                  <div className="rounded-xl border border-stroke bg-card p-6 text-center">
                    <p className="text-sm text-ink4">
                      <Link to="/login" className="font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400">Sign in</Link>{" "}
                      to write a review.
                    </p>
                  </div>
                ) : userReview ? (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckIcon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink">You've already reviewed this product</p>
                        <div className="mt-1 flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <span key={n} className={`text-sm ${n <= userReview.rating ? "text-amber-400" : "text-ink4"}`}>★</span>
                          ))}
                          <span className="ml-1.5 text-xs text-ink4">
                            {new Date(userReview.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                        </div>
                        {userReview.content && (
                          <p className="mt-1.5 text-[13px] leading-relaxed text-ink3">{userReview.content}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
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
                        maxLength={500}
                        placeholder="Share your thoughts about this product…"
                        className="w-full resize-none rounded-lg border border-stroke bg-input px-4 py-3 text-sm text-ink placeholder:text-ink4 transition focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                      />
                      <p className={`mt-1 text-right text-[11px] tabular-nums ${reviewText.length >= 500 ? "text-red-400" : reviewText.length >= 450 ? "text-amber-500" : "text-ink4"}`}>
                        {reviewText.length}/500
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={reviewMutation.isPending}
                      className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {reviewMutation.isPending ? "Submitting…" : "Submit review"}
                    </button>
                  </form>
                )}
              </div>
            )}

            {activeTab === "qa" && (
              <div className="space-y-6">
                <h2 className="font-display text-2xl font-bold text-ink">Questions & Answers</h2>

                {/* Question list */}
                {questionsQuery.isPending ? (
                  <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-20 animate-shimmer rounded-xl" />)}</div>
                ) : questionsQuery.data?.questions.length ? (
                  <ul className="space-y-4">
                    {questionsQuery.data.questions.map((q: ProductQuestion) => (
                      <li key={q.id} className="rounded-xl border border-stroke bg-card p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 text-base font-bold text-emerald-600 dark:text-emerald-400">Q</span>
                            <div>
                              <p className="text-sm font-medium text-ink">{q.question}</p>
                              <p className="mt-0.5 text-[11px] text-ink4">
                                {q.user?.name ?? "Customer"} · {new Date(q.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                              </p>
                            </div>
                          </div>
                          {user && (user.id === q.userId || user.roles === "ADMIN") && (
                            <button
                              type="button"
                              onClick={() => deleteQuestionMutation.mutate(q.id)}
                              className="shrink-0 text-[11px] text-ink4 transition-colors hover:text-red-400"
                            >
                              Delete
                            </button>
                          )}
                        </div>

                        {/* Answers */}
                        {q.answers.length > 0 && (
                          <ul className="mt-3 space-y-2 border-t border-stroke pt-3">
                            {q.answers.map((a) => (
                              <li key={a.id} className="flex items-start gap-3">
                                <span className="mt-0.5 text-base font-bold text-ink3">A</span>
                                <div>
                                  <p className="text-sm text-ink3">{a.answer}</p>
                                  <p className="mt-0.5 text-[11px] text-ink4">
                                    {a.user?.name ?? "Team"} · {new Date(a.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                                  </p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Answer input */}
                        {user && (
                          <div className="mt-3 flex gap-2 border-t border-stroke pt-3">
                            <input
                              type="text"
                              value={qaAnswers[q.id] ?? ""}
                              onChange={(e) => setQaAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                              placeholder="Write an answer…"
                              className="flex-1 rounded-lg border border-stroke bg-input px-3 py-1.5 text-xs text-ink placeholder:text-ink4 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                            />
                            <button
                              type="button"
                              disabled={!qaAnswers[q.id]?.trim() || answerMutation.isPending}
                              onClick={() => {
                                const answer = qaAnswers[q.id]?.trim();
                                if (answer) answerMutation.mutate({ questionId: q.id, answer });
                              }}
                              className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
                            >
                              Post
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-xl border border-stroke bg-card p-8 text-center">
                    <p className="text-sm text-ink4">No questions yet — ask the first one!</p>
                  </div>
                )}

                {/* Ask a question form */}
                {user ? (
                  <form
                    className="space-y-3 rounded-xl border border-stroke bg-card p-5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (qaQuestion.trim()) questionMutation.mutate(qaQuestion.trim());
                    }}
                  >
                    <h3 className="text-sm font-semibold text-ink">Ask a question</h3>
                    {qaFormError && (
                      <p className="text-xs text-red-400">{qaFormError}</p>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={qaQuestion}
                        onChange={(e) => setQaQuestion(e.target.value)}
                        placeholder="What would you like to know about this product?"
                        className="flex-1 rounded-lg border border-stroke bg-input px-3 py-2 text-sm text-ink placeholder:text-ink4 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                        maxLength={500}
                      />
                      <button
                        type="submit"
                        disabled={!qaQuestion.trim() || questionMutation.isPending}
                        className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
                      >
                        {questionMutation.isPending ? "Posting…" : "Ask"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="rounded-xl border border-stroke bg-card p-5 text-center">
                    <p className="text-sm text-ink4">
                      <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">Sign in</Link>{" "}
                      to ask a question.
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
          </AnimatePresence>
        </motion.section>

        {/* Frequently bought together */}
        {(fbtQuery.isPending || (fbtQuery.data && fbtQuery.data.length > 0)) && (
          <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} className="border-t border-stroke pt-12">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Frequently bought together</p>
            <h2 className="mb-7 mt-1.5 font-display text-2xl font-bold text-ink">Frequently bought together</h2>
            {fbtQuery.isPending ? (
              <ProductSkeletonGrid count={4} />
            ) : (
              <>
                <motion.div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
                  {fbtQuery.data?.map((fbt) => (
                    <motion.div key={fbt.product_id} variants={cardFade}><ProductCard product={fbt} /></motion.div>
                  ))}
                </motion.div>
                <button type="button" className="mt-4 inline-block rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600">
                  Add all to cart
                </button>
              </>
            )}
          </motion.section>
        )}

        {/* Related products — after the details, before recently viewed */}
        {(relatedQuery.isPending || (relatedQuery.data && relatedQuery.data.length > 0)) && (
          <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} className="border-t border-stroke pt-12">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">More like this</p>
            <h2 className="mb-7 mt-1.5 font-display text-2xl font-bold text-ink">You may also like</h2>
            {relatedQuery.isPending ? (
              <ProductSkeletonGrid count={4} />
            ) : (
              <motion.div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
                {relatedQuery.data?.map((rp) => (
                  <motion.div key={rp.product_id} variants={cardFade}><ProductCard product={rp} /></motion.div>
                ))}
              </motion.div>
            )}
          </motion.section>
        )}

        {/* Recently viewed */}
        {recentlyViewed.length > 0 && (
          <motion.section
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
            className="border-t border-stroke pt-12"
          >
            <h2 className="mb-7 font-display text-2xl font-bold text-ink">Recently viewed</h2>
            <motion.div
              className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
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
