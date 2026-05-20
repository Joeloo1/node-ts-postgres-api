import { Link } from "react-router-dom";
import { productImageUrl } from "../lib/productImage";
import type { Product } from "../lib/types";
import { CartIcon, StarIcon } from "./Icons";

export function ProductCard({ product }: { product: Product }) {
  const categoryName =
    product.category && "name" in product.category ? product.category.name : null;
  const price =
    product.discount && product.discount > 0
      ? product.price * (1 - product.discount / 100)
      : product.price;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/30 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/60 hover:shadow-xl hover:shadow-black/30">

      {/* Image */}
      <Link
        to={`/products/${product.product_id}`}
        className="relative aspect-[4/3] overflow-hidden bg-zinc-900"
      >
        <img
          src={productImageUrl(product)}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          loading="lazy"
        />

        {/* Dim overlay on hover */}
        <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/15" />

        {/* Out of stock overlay */}
        {!product.availability && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <span className="rounded-full border border-zinc-500/40 bg-zinc-900/80 px-3 py-1 text-xs font-semibold text-zinc-300">
              Out of stock
            </span>
          </div>
        )}

        {/* Discount badge */}
        {product.discount && product.discount > 0 ? (
          <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white shadow">
            −{Math.round(product.discount)}%
          </span>
        ) : null}

        {/* Quick-view button — slides up on hover */}
        {product.availability && (
          <div className="absolute bottom-3 left-3 right-3 translate-y-2 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
            <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-zinc-900 shadow-lg">
              <CartIcon className="size-3.5" />
              View product
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {categoryName ? (
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            {categoryName}
          </p>
        ) : null}

        <Link
          to={`/products/${product.product_id}`}
          className="line-clamp-2 font-display text-[15px] font-semibold leading-snug text-white transition-colors hover:text-emerald-400"
        >
          {product.name}
        </Link>

        {product.brand ? (
          <p className="text-xs text-zinc-600">{product.brand}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-zinc-800/60 pt-3">
          <div>
            <p className="text-[15px] font-bold tabular-nums text-white">
              ${price.toFixed(2)}
              {product.unit ? (
                <span className="text-xs font-normal text-zinc-500"> /{product.unit}</span>
              ) : null}
            </p>
            {product.discount && product.discount > 0 ? (
              <p className="text-xs text-zinc-600 line-through">${product.price.toFixed(2)}</p>
            ) : null}
          </div>

          {product.rating != null ? (
            <div className="flex items-center gap-1">
              <StarIcon className="size-3.5 text-amber-400" filled />
              <span className="text-xs font-semibold text-zinc-400">
                {product.rating.toFixed(1)}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
