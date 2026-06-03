function SkeletonBox({ className = "" }: { className?: string }) {
  return <div className={`animate-shimmer rounded ${className}`} />;
}

export function CartSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <SkeletonBox className="h-8 w-36" />
        <SkeletonBox className="h-4 w-16" />
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <ul className="space-y-3 lg:col-span-2">
          {[1, 2, 3].map((i) => (
            <li key={i} className="flex gap-4 rounded-xl border border-stroke bg-card p-4">
              <SkeletonBox className="h-24 w-24 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2 pt-1">
                <SkeletonBox className="h-4 w-3/4" />
                <SkeletonBox className="h-3 w-1/4" />
                <div className="mt-3 flex gap-3">
                  <SkeletonBox className="h-8 w-24 rounded-lg" />
                  <SkeletonBox className="h-8 w-16 rounded-lg" />
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="h-fit space-y-4 rounded-xl border border-stroke bg-card p-6">
          <SkeletonBox className="h-5 w-32" />
          <div className="space-y-2.5">
            <SkeletonBox className="h-4 w-full" />
            <SkeletonBox className="h-4 w-full" />
          </div>
          <SkeletonBox className="h-px w-full" />
          <SkeletonBox className="h-5 w-24" />
          <SkeletonBox className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function OrdersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <SkeletonBox className="h-8 w-28" />
        <SkeletonBox className="h-4 w-20" />
      </div>
      <ul className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <li key={i} className="flex items-center justify-between gap-4 rounded-xl border border-stroke bg-card px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {[1, 2].map((j) => (
                  <SkeletonBox key={j} className="size-11 rounded-lg ring-2 ring-raised" />
                ))}
              </div>
              <div className="space-y-1.5">
                <SkeletonBox className="h-3 w-24" />
                <SkeletonBox className="h-3 w-20" />
                <SkeletonBox className="h-3 w-12" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <SkeletonBox className="h-6 w-20 rounded-full" />
              <SkeletonBox className="h-6 w-16" />
              <SkeletonBox className="h-4 w-4" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OrderDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <SkeletonBox className="h-3 w-10" />
        <SkeletonBox className="h-3 w-3" />
        <SkeletonBox className="h-3 w-16" />
      </div>
      <div className="space-y-2">
        <SkeletonBox className="h-8 w-56" />
        <SkeletonBox className="h-4 w-32" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-4 rounded-xl border border-stroke bg-card p-4">
              <SkeletonBox className="h-20 w-20 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2 pt-1">
                <SkeletonBox className="h-4 w-3/4" />
                <SkeletonBox className="h-3 w-1/4" />
                <SkeletonBox className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-fit space-y-4 rounded-xl border border-stroke bg-card p-6">
          <SkeletonBox className="h-5 w-32" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <SkeletonBox key={i} className="h-4 w-full" />)}
          </div>
          <SkeletonBox className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function ProductSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-stroke bg-card">
      <div className="aspect-[3/4] animate-shimmer" />
      <div className="flex flex-col gap-1.5 p-3">
        <div className="flex items-center justify-between gap-2">
          <SkeletonBox className="h-2.5 w-14" />
          <SkeletonBox className="h-2.5 w-8" />
        </div>
        <SkeletonBox className="h-[36px] w-full" />
        <SkeletonBox className="h-4 w-16 mt-1" />
      </div>
    </div>
  );
}

export function ProductSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductSkeletonGrid3({ count = 12 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}

export function AccountProfileSkeleton() {
  return (
    <div className="rounded-xl border border-stroke bg-card p-6 space-y-6">
      <SkeletonBox className="h-5 w-20" />
      <div className="flex items-center gap-4">
        <SkeletonBox className="size-16 rounded-full shrink-0" />
        <div className="space-y-2">
          <SkeletonBox className="h-4 w-24" />
          <SkeletonBox className="h-3 w-40" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1">
            <SkeletonBox className="h-3 w-16" />
            <SkeletonBox className="h-4 w-full" />
          </div>
        ))}
      </div>
      <div className="space-y-3 border-t border-stroke pt-6">
        <SkeletonBox className="h-4 w-28" />
        {[1, 2, 3].map((i) => <SkeletonBox key={i} className="h-10 w-full rounded-lg" />)}
        <SkeletonBox className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  );
}

export function AccountAddressesSkeleton() {
  return (
    <div className="rounded-xl border border-stroke bg-card p-6 space-y-4">
      <SkeletonBox className="h-5 w-24" />
      {[1, 2].map((i) => (
        <div key={i} className="rounded-lg border border-stroke bg-card p-4 space-y-2">
          <SkeletonBox className="h-4 w-3/4" />
          <SkeletonBox className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function AdminTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="mt-4 space-y-2">
      <div className="grid grid-cols-4 gap-4 border-b border-stroke pb-2">
        {[1, 2, 3, 4].map((i) => <SkeletonBox key={i} className="h-3 w-full" />)}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-4 border-b border-stroke py-3">
          {[1, 2, 3, 4].map((j) => <SkeletonBox key={j} className="h-4 w-full" />)}
        </div>
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="space-y-12">
      <div className="flex items-center gap-2">
        {[10, 3, 10, 3, 36].map((w, i) => (
          <SkeletonBox key={i} className={`h-3 w-${w}`} />
        ))}
      </div>
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="space-y-3">
          <div className="aspect-[3/4] w-full animate-shimmer rounded-xl" />
          <div className="flex gap-2.5">
            {[1, 2, 3].map((i) => (
              <SkeletonBox key={i} className="h-20 w-20 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="space-y-6 pt-1">
          <SkeletonBox className="h-4 w-24" />
          <div className="space-y-3">
            <SkeletonBox className="h-9 w-5/6 rounded-lg" />
            <SkeletonBox className="h-9 w-3/5 rounded-lg" />
          </div>
          <SkeletonBox className="h-8 w-28 rounded-lg" />
          <div className="space-y-2 pt-2">
            {[1, 2, 3].map((i) => (
              <SkeletonBox key={i} className="h-4 w-full" />
            ))}
            <SkeletonBox className="h-4 w-2/3" />
          </div>
          <div className="flex gap-3 pt-4">
            <SkeletonBox className="h-12 w-32 rounded-xl" />
            <SkeletonBox className="h-12 w-40 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
