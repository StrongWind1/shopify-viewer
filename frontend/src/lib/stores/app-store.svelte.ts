import type {
  ShopifyProduct,
  ShopifyMeta,
  ProductSummary,
  ProductListRow,
  CategoryGroup,
  PriceAnalysis,
  RecentStore,
  AppState,
  ViewId,
} from "../types/shopify-types.js";
import { toProductSummaries, toProductListRows, toCategoryGroups, toPriceAnalysis } from "../utils/data-transforms.js";

const MAX_RECENT = 20;
const STORAGE_KEY = "shopify-viewer-recent";

let products = $state<ShopifyProduct[]>([]);
let meta = $state<ShopifyMeta | null>(null);
let domain = $state("");
let appState = $state<AppState>({ status: "idle" });
let activeView = $state<ViewId>("summary");
let fetchedAt = $state<Date | null>(null);

const productSummaries = $derived(domain !== "" ? toProductSummaries(products, domain) : []);
const productListRows = $derived(domain !== "" ? toProductListRows(products, domain) : []);
const categoryGroups = $derived(toCategoryGroups(productSummaries, products));
const priceAnalysis = $derived(products.length > 0 ? toPriceAnalysis(products, domain) : null);

function loadRecentStores(): RecentStore[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as RecentStore[];
  } catch {
    return [];
  }
}

function saveRecentStores(stores: RecentStore[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stores));
  } catch {
    // localStorage unavailable
  }
}

function addRecentStore(storeDomain: string, storeName: string): void {
  const stores = loadRecentStores().filter((s) => s.domain !== storeDomain);
  stores.unshift({ domain: storeDomain, name: storeName, lastVisited: new Date().toISOString() });
  if (stores.length > MAX_RECENT) {
    stores.length = MAX_RECENT;
  }
  saveRecentStores(stores);
}

function clearRecentStores(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable
  }
}

function syncUrlParams(): void {
  const url = new URL(window.location.href);
  if (domain !== "") {
    url.searchParams.set("store", domain);
  } else {
    url.searchParams.delete("store");
  }
  url.searchParams.set("view", activeView);
  window.history.replaceState(null, "", url.toString());
}

function readUrlParams(): { store: string | null; view: ViewId | null } {
  const url = new URL(window.location.href);
  const store = url.searchParams.get("store");
  const view = url.searchParams.get("view") as ViewId | null;
  const validViews: ViewId[] = ["summary", "products", "cards", "categories", "analysis", "export"];
  return {
    store,
    view: view !== null && validViews.includes(view) ? view : null,
  };
}

export const store = {
  get products() { return products; },
  get meta() { return meta; },
  get domain() { return domain; },
  get appState() { return appState; },
  get activeView() { return activeView; },
  get fetchedAt() { return fetchedAt; },
  get productSummaries() { return productSummaries; },
  get productListRows() { return productListRows; },
  get categoryGroups() { return categoryGroups; },
  get priceAnalysis() { return priceAnalysis; },

  setProducts(p: ShopifyProduct[]) { products = p; },
  appendProducts(p: ShopifyProduct[]) { products = [...products, ...p]; },
  setMeta(m: ShopifyMeta) { meta = m; },
  setDomain(d: string) { domain = d; },
  setAppState(s: AppState) { appState = s; },

  setActiveView(v: ViewId) {
    activeView = v;
    syncUrlParams();
  },

  onFetchComplete(storeDomain: string, storeName: string) {
    fetchedAt = new Date();
    addRecentStore(storeDomain, storeName);
    syncUrlParams();
  },

  reset() {
    products = [];
    meta = null;
    appState = { status: "idle" };
  },

  getRecentStores: loadRecentStores,
  clearRecentStores,
  readUrlParams,
};
