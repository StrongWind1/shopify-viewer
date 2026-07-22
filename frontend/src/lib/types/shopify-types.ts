export interface ShopifyImage {
  id: number;
  product_id: number;
  position: number;
  created_at: string;
  updated_at: string;
  src: string;
  width: number;
  height: number;
  alt: string | null;
  variant_ids: number[];
}

export interface ShopifyOption {
  name: string;
  position: number;
  values: string[];
}

export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  compare_at_price: string | null;
  sku: string;
  position: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  grams: number;
  requires_shipping: boolean;
  taxable: boolean;
  available: boolean;
  featured_image: ShopifyImage | null;
  created_at: string;
  updated_at: string;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  published_at: string;
  created_at: string;
  updated_at: string;
  vendor: string;
  product_type: string;
  tags: string[];
  variants: ShopifyVariant[];
  images: ShopifyImage[];
  options: ShopifyOption[];
}

export interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

export interface ShopifyMeta {
  id: number;
  name: string;
  city: string;
  province: string;
  country: string;
  currency: string;
  domain: string;
  myshopify_domain: string;
  description: string;
  ships_to_countries: string[];
  money_format: string;
  published_collections_count: number;
  published_products_count: number;
}

export interface ProductSummary {
  id: number;
  category: string;
  title: string;
  price: number;
  inStock: boolean;
  url: string;
  handle: string;
}

export interface ProductListRow {
  productId: number;
  variantId: number;
  category: string;
  title: string;
  option: string;
  price: number;
  originalPrice: number | null;
  inStock: boolean;
  url: string;
  weightGrams: number;
  createdAt: string;
}

export interface CategoryGroup {
  name: string;
  products: ProductSummary[];
  productCount: number;
  variantCount: number;
  inStockCount: number;
  inStockRate: number;
  priceMin: number;
  priceMax: number;
}

export interface PriceBucket {
  min: number;
  max: number;
  count: number;
  label: string;
}

export interface RankedProduct {
  rank: number;
  title: string;
  price: number;
  category: string;
  handle: string;
}

export interface SaleAnalysis {
  count: number;
  totalVariants: number;
  percentage: number;
  averageDiscount: number;
  biggestDiscount: { percentage: number; productTitle: string };
  totalSavings: number;
}

export interface CategoryPricing {
  name: string;
  productCount: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  spread: number;
}

export interface PriceAnalysis {
  totalProducts: number;
  totalVariants: number;
  averagePrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  saleItems: SaleAnalysis;
  categoryPricing: CategoryPricing[];
  distribution: PriceBucket[];
  mostExpensive: RankedProduct[];
  leastExpensive: RankedProduct[];
}

export interface RecentStore {
  domain: string;
  name: string;
  lastVisited: string;
}

export interface FetchProgress {
  current: number;
  total: number;
}

export const VIEW_IDS = {
  summary: "summary",
  products: "products",
  cards: "cards",
  categories: "categories",
  analysis: "analysis",
  history: "history",
  export: "export",
} as const;

export type ViewId = (typeof VIEW_IDS)[keyof typeof VIEW_IDS];

export type AppState =
  | { status: "idle" }
  | { status: "validating" }
  | { status: "fetching_meta" }
  | { status: "fetching_products"; progress: FetchProgress }
  | { status: "loaded" }
  | { status: "error"; code: ErrorCode; message: string; partialProducts: number };

export type ErrorCode =
  | "INVALID_URL"
  | "STORE_NOT_FOUND"
  | "STORE_PASSWORD"
  | "PROXY_ERROR"
  | "RATE_LIMITED"
  | "FETCH_TIMEOUT"
  | "PARTIAL_FETCH"
  | "EMPTY_STORE"
  | "UNKNOWN_ERROR";
