import type {
  ShopifyProduct,
  ProductSummary,
  ProductListRow,
  CategoryGroup,
  PriceAnalysis,
  SaleAnalysis,
  CategoryPricing,
  PriceBucket,
  RankedProduct,
} from "../types/shopify-types.js";
import { parsePrice, computeDiscount, median } from "./price-utils.js";

export function toProductSummaries(products: ShopifyProduct[], domain: string): ProductSummary[] {
  return products.map((p) => {
    const prices = p.variants.map((v) => parsePrice(v.price));
    return {
      id: p.id,
      category: p.product_type === "" ? "Uncategorized" : p.product_type,
      title: p.title,
      price: prices.length > 0 ? Math.min(...prices) : 0,
      inStock: p.variants.some((v) => v.available),
      url: `https://${domain}/products/${p.handle}`,
      handle: p.handle,
    };
  });
}

export function toProductListRows(products: ShopifyProduct[], domain: string): ProductListRow[] {
  const rows: ProductListRow[] = [];
  for (const p of products) {
    for (const v of p.variants) {
      const compareAt = v.compare_at_price !== null ? parsePrice(v.compare_at_price) : null;
      rows.push({
        productId: p.id,
        variantId: v.id,
        category: p.product_type === "" ? "Uncategorized" : p.product_type,
        title: p.title,
        option: v.title === "Default Title" ? "" : v.title,
        price: parsePrice(v.price),
        originalPrice: compareAt !== null && compareAt !== parsePrice(v.price) ? compareAt : null,
        inStock: v.available,
        url: `https://${domain}/products/${p.handle}?variant=${String(v.id)}`,
        weightGrams: v.grams,
        createdAt: v.created_at,
      });
    }
  }
  return rows;
}

export function toCategoryGroups(summaries: ProductSummary[], products: ShopifyProduct[]): CategoryGroup[] {
  const groups = new Map<string, { summaries: ProductSummary[]; variantCount: number; allPrices: number[] }>();

  for (let i = 0; i < summaries.length; i++) {
    const s = summaries[i];
    const p = products[i];
    if (s === undefined || p === undefined) continue;

    let group = groups.get(s.category);
    if (group === undefined) {
      group = { summaries: [], variantCount: 0, allPrices: [] };
      groups.set(s.category, group);
    }
    group.summaries.push(s);
    group.variantCount += p.variants.length;
    for (const v of p.variants) {
      group.allPrices.push(parsePrice(v.price));
    }
  }

  const result: CategoryGroup[] = [];
  for (const [name, g] of groups) {
    const inStockCount = g.summaries.filter((s) => s.inStock).length;
    result.push({
      name,
      products: g.summaries.toSorted((a, b) => a.title.localeCompare(b.title)),
      productCount: g.summaries.length,
      variantCount: g.variantCount,
      inStockCount,
      inStockRate: g.summaries.length > 0 ? Math.round((inStockCount / g.summaries.length) * 1000) / 10 : 0,
      priceMin: g.allPrices.length > 0 ? Math.min(...g.allPrices) : 0,
      priceMax: g.allPrices.length > 0 ? Math.max(...g.allPrices) : 0,
    });
  }

  return result.toSorted((a, b) => b.productCount - a.productCount);
}

export function toPriceAnalysis(products: ShopifyProduct[], domain: string): PriceAnalysis {
  const allPrices: number[] = [];
  let totalVariants = 0;
  let saleCount = 0;
  let totalSavings = 0;
  const discounts: { pct: number; title: string }[] = [];
  const categoryPriceMap = new Map<string, number[]>();

  for (const p of products) {
    const cat = p.product_type === "" ? "Uncategorized" : p.product_type;
    let catPrices = categoryPriceMap.get(cat);
    if (catPrices === undefined) {
      catPrices = [];
      categoryPriceMap.set(cat, catPrices);
    }

    for (const v of p.variants) {
      totalVariants++;
      const price = parsePrice(v.price);
      allPrices.push(price);
      catPrices.push(price);

      if (v.compare_at_price !== null) {
        const original = parsePrice(v.compare_at_price);
        if (original > price) {
          saleCount++;
          const saving = original - price;
          totalSavings += saving;
          discounts.push({ pct: computeDiscount(original, price), title: p.title });
        }
      }
    }
  }

  const sorted = [...allPrices].sort((a, b) => a - b);
  const avg = allPrices.length > 0 ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : 0;

  let biggest = { percentage: 0, productTitle: "" };
  for (const d of discounts) {
    if (d.pct > biggest.percentage) {
      biggest = { percentage: Math.round(d.pct * 10) / 10, productTitle: d.title };
    }
  }

  const saleItems: SaleAnalysis = {
    count: saleCount,
    totalVariants,
    percentage: totalVariants > 0 ? Math.round((saleCount / totalVariants) * 1000) / 10 : 0,
    averageDiscount:
      discounts.length > 0
        ? Math.round((discounts.reduce((a, b) => a + b.pct, 0) / discounts.length) * 10) / 10
        : 0,
    biggestDiscount: biggest,
    totalSavings,
  };

  const categoryPricing: CategoryPricing[] = [];
  for (const [name, prices] of categoryPriceMap) {
    const catAvg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const catMin = Math.min(...prices);
    const catMax = Math.max(...prices);
    categoryPricing.push({
      name,
      productCount: prices.length,
      averagePrice: Math.round(catAvg * 100) / 100,
      minPrice: catMin,
      maxPrice: catMax,
      spread: Math.round((catMax - catMin) * 100) / 100,
    });
  }
  categoryPricing.sort((a, b) => b.averagePrice - a.averagePrice);

  const distribution = computeDistribution(sorted);

  const productPrices = products.map((p) => ({
    title: p.title,
    handle: p.handle,
    category: p.product_type === "" ? "Uncategorized" : p.product_type,
    maxPrice: Math.max(...p.variants.map((v) => parsePrice(v.price))),
    minPrice: Math.min(...p.variants.map((v) => parsePrice(v.price))),
  }));

  const mostExpensive: RankedProduct[] = productPrices
    .toSorted((a, b) => b.maxPrice - a.maxPrice)
    .slice(0, 5)
    .map((p, i) => ({ rank: i + 1, title: p.title, price: p.maxPrice, category: p.category, handle: p.handle }));

  const leastExpensive: RankedProduct[] = productPrices
    .filter((p) => p.minPrice > 0)
    .toSorted((a, b) => a.minPrice - b.minPrice)
    .slice(0, 5)
    .map((p, i) => ({ rank: i + 1, title: p.title, price: p.minPrice, category: p.category, handle: p.handle }));

  return {
    totalProducts: products.length,
    totalVariants,
    averagePrice: Math.round(avg * 100) / 100,
    medianPrice: Math.round(median(allPrices) * 100) / 100,
    minPrice: sorted[0] ?? 0,
    maxPrice: sorted[sorted.length - 1] ?? 0,
    saleItems,
    categoryPricing,
    distribution,
    mostExpensive,
    leastExpensive,
  };
}

function computeDistribution(sorted: number[]): PriceBucket[] {
  if (sorted.length === 0) return [];

  const min = sorted[0] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;
  const range = max - min;

  let bucketSize: number;
  if (range <= 100) bucketSize = 10;
  else if (range <= 500) bucketSize = 50;
  else if (range <= 2000) bucketSize = 100;
  else bucketSize = 500;

  const bucketCount = Math.ceil(range / bucketSize);
  if (bucketCount > 20) {
    bucketSize = Math.ceil(range / 20);
  }

  const bucketStart = Math.floor(min / bucketSize) * bucketSize;
  const buckets: PriceBucket[] = [];
  const numBuckets = Math.min(Math.ceil((max - bucketStart) / bucketSize) + 1, 20);

  for (let i = 0; i < numBuckets; i++) {
    const lo = bucketStart + i * bucketSize;
    const hi = lo + bucketSize;
    buckets.push({
      min: lo,
      max: hi,
      count: 0,
      label: `$${String(lo)}–$${String(hi)}`,
    });
  }

  for (const price of sorted) {
    const idx = Math.min(Math.floor((price - bucketStart) / bucketSize), buckets.length - 1);
    const bucket = buckets[idx];
    if (bucket !== undefined) {
      bucket.count++;
    }
  }

  return buckets.filter((b) => b.count > 0);
}
