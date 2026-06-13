const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPrice(value: number): string {
  return fmt.format(value);
}

export function effectivePrice(price: number, discount: number | null): number {
  if (!discount || discount <= 0) return price;
  return price * (1 - discount / 100);
}
