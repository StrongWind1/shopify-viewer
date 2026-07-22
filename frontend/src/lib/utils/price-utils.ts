let cachedFormatter: Intl.NumberFormat | null = null;
let cachedCurrency = "";

export function formatPrice(value: number, currency: string | undefined): string {
  const curr = currency ?? "USD";
  if (cachedFormatter === null || cachedCurrency !== curr) {
    cachedCurrency = curr;
    try {
      cachedFormatter = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: curr,
      });
    } catch {
      cachedFormatter = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
      });
    }
  }
  return cachedFormatter.format(value);
}

export function parsePrice(value: string): number {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function computeDiscount(originalPrice: number, currentPrice: number): number {
  if (originalPrice <= 0 || originalPrice <= currentPrice) {
    return 0;
  }
  return ((originalPrice - currentPrice) / originalPrice) * 100;
}

export function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid] ?? 0;
}
