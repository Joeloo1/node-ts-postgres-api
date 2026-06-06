import { Link } from "react-router-dom";
import { productImageUrl } from "../lib/productImage";
import type { Product } from "../lib/types";

export function ProductListItem({ product }: { product: Product }) {
  const displayPrice = product.discount && product.discount > 0
    ? product.price * (1 - product.discount / 100)
    : product.price;
  const hasDiscount = Boolean(product.discount && product.discount > 0);
  const categoryName = product.category && "name" in product.category ? product.category.name : null;

  return (
    <Link
      to={`/products/${product.product_id}`}
      className="group flex items-center gap-4 rounded-2xl border border-stroke bg-card px-4 py-3.5 transition-all duration-200 hover:border-edge hover:bg-raised hover:shadow-lg hover:shadow-black/8"
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-raised sm:size-[72px]">
        <img
          src={productImageUrl(product)}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.06]"
          loading="lazy"
        />
        {hasDiscount && (
          <span className="absolute left-1 top-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
            −{Math.round(product.discount!)}%
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink4">{categoryName ?? product.brand ?? ""}</p>
        <p className="mt-0.5 text-sm font-semibold text-ink line-clamp-1 transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
          {product.name}
        </p>
        {product.description && (
          <p className="mt-0.5 text-xs text-ink4 line-clamp-1 hidden sm:block">{product.description}</p>
        )}
        {!product.availability && (
          <span className="mt-1 inline-block text-[11px] font-medium text-red-400">Out of stock</span>
        )}
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-bold tabular-nums text-ink">${displayPrice.toFixed(2)}</p>
        {hasDiscount && <p className="text-[11px] tabular-nums text-ink4 line-through">${product.price.toFixed(2)}</p>}
        {product.rating != null && <p className="mt-0.5 text-[11px] font-medium text-amber-500">★ {product.rating.toFixed(1)}</p>}
      </div>

      <svg className="size-4 shrink-0 text-ink4 transition-all group-hover:translate-x-0.5 group-hover:text-ink3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </Link>
  );
}
