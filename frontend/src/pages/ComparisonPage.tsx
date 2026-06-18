import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { usePageTitle } from "../hooks/usePageTitle";
import { useCompare } from "../context/CompareContext";
import { productImageUrl } from "../lib/productImage";
import { formatPrice, effectivePrice } from "../lib/pricing";
import { XIcon, StarIcon, CheckCircleIcon, ShieldIcon, TruckIcon } from "../components/Icons";
import { useCartMutations } from "../hooks/useCartMutations";

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} className="size-3.5" filled={rating >= n} />
      ))}
    </div>
  );
}

export function ComparisonPage() {
  usePageTitle("Compare Products");
  const { items, remove, clear } = useCompare();
  const { addItem } = useCartMutations();

  const specs: { label: string; key: keyof ReturnType<typeof getSpecs> }[] = [
    { label: "Price", key: "price" },
    { label: "Rating", key: "rating" },
    { label: "Brand", key: "brand" },
    { label: "Category", key: "category" },
    { label: "Availability", key: "availability" },
    { label: "Discount", key: "discount" },
  ];

  function getSpecs(p: (typeof items)[0]) {
    const ep = effectivePrice(p.price, p.discount);
    return {
      price: formatPrice(ep),
      rating: p.rating ?? 0,
      brand: p.brand ?? "—",
      category: (p.category && "name" in p.category) ? p.category.name : "—",
      availability: p.availability,
      discount: p.discount ? `${p.discount}% off` : "—",
    };
  }

  return (
    <>
      <Helmet>
        <title>Compare Products — Northline</title>
        <meta name="description" content="Compare products side by side to find the best fit for your needs. Compare price, rating, specs, and more." />
        <meta property="og:title" content="Compare Products — Northline" />
        <meta property="og:description" content="Side-by-side product comparison at Northline." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Northline" />
      </Helmet>

      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Side by side</p>
            <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Compare Products</h1>
            <p className="mt-1 text-sm text-ink3">
              {items.length > 0
                ? `Comparing ${items.length} product${items.length !== 1 ? "s" : ""}`
                : "Add products to compare them side by side"}
            </p>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="rounded-lg border border-stroke px-3.5 py-2 text-xs font-semibold text-ink3 transition-colors hover:bg-raised hover:text-ink"
            >
              Clear all
            </button>
          )}
        </motion.div>

        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-stroke bg-card py-24 text-center"
          >
            <div className="mb-4 flex size-20 items-center justify-center rounded-3xl border border-stroke bg-raised text-ink4 shadow-sm">
              <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6.75ZM3 12a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Zm0 5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-ink">No products selected</p>
            <p className="mt-1 max-w-sm text-sm text-ink3">
              Browse products and click the compare button to add them here. You can compare up to 4 products at once.
            </p>
            <Link
              to="/products"
              className="relative mt-5 inline-block overflow-hidden rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-colors hover:bg-emerald-700 active:scale-[0.98]"
            >
              <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
              Browse products
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="overflow-x-auto"
          >
            <div
              className="min-w-[640px]"
              style={{ gridTemplateColumns: `180px repeat(${items.length}, 1fr)` }}
            >
              {/* Product header row */}
              <div
                className="grid gap-3 border-b border-stroke pb-5"
                style={{ gridTemplateColumns: `180px repeat(${items.length}, 1fr)` }}
              >
                <div />
                {items.map((p) => (
                  <div key={p.product_id} className="relative rounded-2xl border border-stroke bg-card p-4 text-center transition-shadow hover:border-edge hover:shadow-md hover:shadow-black/8">
                    <button
                      type="button"
                      onClick={() => remove(p.product_id)}
                      aria-label={`Remove ${p.name} from comparison`}
                      className="absolute right-2 top-2 rounded-full p-1 text-ink4 transition-colors hover:bg-raised hover:text-ink"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                    <Link to={`/products/${p.product_id}`}>
                      <img
                        src={productImageUrl(p)}
                        alt={p.name}
                        className="mx-auto mb-3 size-28 rounded-2xl object-cover"
                      />
                      <p className="line-clamp-2 text-sm font-semibold text-ink leading-snug hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                        {p.name}
                      </p>
                    </Link>
                    <div className="mt-2 text-lg font-bold text-ink">
                      {formatPrice(effectivePrice(p.price, p.discount))}
                    </div>
                    {p.discount && (
                      <div className="text-xs text-ink4 line-through">{formatPrice(p.price)}</div>
                    )}
                    <button
                      type="button"
                      onClick={() => addItem.mutate({ productId: p.product_id, quantity: 1 })}
                      className="relative mt-3 w-full overflow-hidden rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
                    >
                      <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
                      Add to cart
                    </button>
                  </div>
                ))}
              </div>

              {/* Spec rows */}
              {specs.map(({ label, key }) => (
                <div
                  key={label}
                  className="grid items-center gap-3 border-b border-stroke/60 py-4 transition-colors hover:bg-raised/30"
                  style={{ gridTemplateColumns: `180px repeat(${items.length}, 1fr)` }}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-ink4">{label}</div>
                  {items.map((p) => {
                    const val = getSpecs(p)[key];
                    if (key === "rating") {
                      return (
                        <div key={p.product_id} className="flex flex-col items-center gap-1">
                          <RatingStars rating={val as number} />
                          <span className="text-xs text-ink3">{(val as number).toFixed(1)}</span>
                        </div>
                      );
                    }
                    if (key === "availability") {
                      return (
                        <div key={p.product_id} className="flex justify-center">
                          {val ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircleIcon className="size-3.5" />
                              In stock
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-red-500">Out of stock</span>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div key={p.product_id} className="text-center text-sm font-medium text-ink">
                        {String(val)}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Trust badges row */}
              <div
                className="grid items-start gap-3 pt-5"
                style={{ gridTemplateColumns: `180px repeat(${items.length}, 1fr)` }}
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-ink4">Includes</div>
                {items.map((p) => (
                  <div key={p.product_id} className="flex flex-col items-center gap-1.5">
                    {[
                      { icon: TruckIcon, label: "Free shipping" },
                      { icon: ShieldIcon, label: "2-year warranty" },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-1.5 text-xs text-ink3">
                        <Icon className="size-3.5 text-ink4" />
                        {label}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
}
