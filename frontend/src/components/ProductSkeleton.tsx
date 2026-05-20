export function ProductSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/30">
      <div className="aspect-[4/3] animate-pulse bg-zinc-800" />
      <div className="flex flex-col gap-2.5 p-4">
        <div className="h-2.5 w-14 animate-pulse rounded bg-zinc-800" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-zinc-800" />
        <div className="h-3 w-2/5 animate-pulse rounded bg-zinc-800" />
        <div className="mt-2 flex items-center justify-between border-t border-zinc-800/60 pt-3">
          <div className="h-4 w-16 animate-pulse rounded bg-zinc-800" />
          <div className="h-3 w-10 animate-pulse rounded bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}

export function ProductSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductSkeletonGrid3({ count = 12 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}
