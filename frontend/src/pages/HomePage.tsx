import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ProductCard } from "../components/ProductCard";
import { ProductSkeletonGrid } from "../components/ProductSkeleton";
import { apiFetch } from "../lib/api";
import type { Product } from "../lib/types";
import {
  ArrowRightIcon,
  PackageIcon,
  PhoneIcon,
  ShieldIcon,
  TruckIcon,
} from "../components/Icons";

type ProductsRes = {
  status: string;
  data: { products: Product[] };
};

const trustBadges = [
  { icon: TruckIcon, title: "Free shipping", desc: "On orders over $50" },
  { icon: PackageIcon, title: "Easy returns", desc: "30-day return policy" },
  { icon: ShieldIcon, title: "Secure checkout", desc: "256-bit SSL encrypted" },
  { icon: PhoneIcon, title: "24/7 Support", desc: "Always here to help" },
];

export function HomePage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const res = await apiFetch<ProductsRes>(
        "/api/v1/products?limit=8&sortBy=createdAt&order=desc",
      );
      return res.data.products;
    },
  });

  return (
    <div className="space-y-20">

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(16,185,129,0.13),transparent)]" />
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(ellipse_60%_80%_at_100%_50%,rgba(16,185,129,0.07),transparent)]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative px-8 py-20 sm:px-14 sm:py-28">
          <div className="max-w-2xl space-y-7">
            {/* Live badge */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
                New arrivals in
              </span>
            </div>

            <h1 className="font-display text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
              <span className="text-white">Quality goods,</span>
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                thoughtfully curated.
              </span>
            </h1>

            <p className="max-w-lg text-lg leading-relaxed text-zinc-400">
              Discover essentials from electronics to everyday items — honest
              pricing, seamless checkout, and products worth keeping.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-emerald-500 hover:gap-3"
              >
                Shop now
                <ArrowRightIcon className="size-4" />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-6 py-3.5 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800/80"
              >
                Create account
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-zinc-500">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400">★★★★★</span>
                <span>4.9 / 5 from 2,300+ reviews</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {["J", "A", "M", "S"].map((l) => (
                    <div
                      key={l}
                      className="flex size-6 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-bold text-zinc-300 ring-1 ring-zinc-950"
                    >
                      {l}
                    </div>
                  ))}
                </div>
                <span>12k+ happy customers</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust badges ────────────────────────────── */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {trustBadges.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-5 text-center transition-all hover:border-zinc-700 hover:bg-zinc-900/50"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ── New arrivals ─────────────────────────────── */}
      <section>
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">
              Fresh stock
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-white">
              New arrivals
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              The latest additions to our catalog
            </p>
          </div>
          <Link
            to="/products"
            className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
          >
            View all
            <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {isPending ? (
          <ProductSkeletonGrid count={8} />
        ) : isError ? (
          <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-6 text-center">
            <p className="text-sm text-red-300">
              Could not load products — is the API running?
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {data?.map((p) => (
              <ProductCard key={p.product_id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* ── CTA banner ──────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-emerald-900/30 bg-gradient-to-r from-emerald-950/60 to-zinc-950 px-8 py-14 text-center sm:px-14 sm:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_120%,rgba(16,185,129,0.1),transparent)]" />
        <div className="relative">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Ready to start shopping?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-zinc-400">
            Join thousands of customers who trust Northline for quality essentials.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              Create free account
            </Link>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-600 px-6 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800/80"
            >
              Browse catalog
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
