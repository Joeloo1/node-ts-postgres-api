export const queryKeys = {
  me:          () => ["me"] as const,
  cart:        () => ["cart"] as const,
  categories:  () => ["categories"] as const,
  orders:      () => ["orders"] as const,
  order:       (id: string) => ["order", id] as const,
  products:    (qs?: string) => qs ? (["products", qs] as const) : (["products"] as const),
  deals:       () => ["products", "deals"] as const,
  product:     (id: string) => ["product", id] as const,
  reviews:     (productId: string) => ["reviews", productId] as const,
  addresses:   () => ["addresses"] as const,
  suggestions: (q: string) => ["suggestions", q] as const,
  search:      (q: string) => ["search", q] as const,
};
