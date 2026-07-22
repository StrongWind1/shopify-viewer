import type {
  ShopifyProduct,
  ShopifyMeta,
  ShopifyCollection,
  ErrorCode,
} from "../types/shopify-types.js";
import { normalizeDomain } from "../utils/url-utils.js";

const PROXY_BASE = "https://shopify-viewer-proxy.strongwind.workers.dev";
const PAGE_LIMIT = 250;
const PAGE_DELAY_MS = 500;
const META_TIMEOUT_MS = 10_000;
const PAGE_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 2_000;

export class ShopifyError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "ShopifyError";
  }
}

interface ProxyError {
  error: string;
  code: string;
}

function isProxyError(data: unknown): data is ProxyError {
  return typeof data === "object" && data !== null && "error" in data && "code" in data;
}

function proxyCodeToErrorCode(code: string): ErrorCode {
  switch (code) {
    case "INVALID_STORE":
    case "MISSING_STORE":
      return "INVALID_URL";
    case "NOT_SHOPIFY":
      return "STORE_NOT_FOUND";
    case "UPSTREAM_ERROR":
      return "PROXY_ERROR";
    default:
      return "UNKNOWN_ERROR";
  }
}

async function proxyFetch(
  path: string,
  params: Record<string, string>,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<unknown> {
  const url = new URL(path, PROXY_BASE);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  if (signal !== undefined) {
    signal.addEventListener(
      "abort",
      () => {
        controller.abort();
      },
      { once: true },
    );
  }

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });

    if (response.status === 429) {
      throw new ShopifyError(
        "RATE_LIMITED",
        "Too many requests. Please wait a moment and try again.",
      );
    }

    const data: unknown = await response.json();

    if (!response.ok) {
      if (isProxyError(data)) {
        throw new ShopifyError(proxyCodeToErrorCode(data.code), data.error);
      }
      throw new ShopifyError("PROXY_ERROR", `Proxy returned ${String(response.status)}`);
    }

    return data;
  } catch (err) {
    if (err instanceof ShopifyError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      if (signal?.aborted === true) throw err;
      throw new ShopifyError("FETCH_TIMEOUT", "The store took too long to respond.");
    }
    throw new ShopifyError("PROXY_ERROR", "Unable to reach the proxy server.");
  } finally {
    clearTimeout(timeout);
  }
}

export function validateStoreInput(input: string): string {
  const domain = normalizeDomain(input);
  if (domain === null) {
    throw new ShopifyError("INVALID_URL", "Enter a valid Shopify store URL (e.g., lttstore.com)");
  }
  return domain;
}

export async function fetchMeta(domain: string, signal?: AbortSignal): Promise<ShopifyMeta> {
  const data = await proxyFetch("/api/meta", { store: domain }, META_TIMEOUT_MS, signal);

  if (typeof data !== "object" || data === null || !("name" in data)) {
    throw new ShopifyError("STORE_NOT_FOUND", "This doesn't appear to be a Shopify store.");
  }

  return data as ShopifyMeta;
}

export async function fetchAllProducts(
  domain: string,
  onProgress: (current: number, total: number) => void,
  signal?: AbortSignal,
): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = [];
  let page = 1;

  while (true) {
    if (signal?.aborted === true) throw new DOMException("Aborted", "AbortError");

    let pageProducts: ShopifyProduct[] | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const data = await proxyFetch(
          "/api/products",
          { store: domain, page: String(page), limit: String(PAGE_LIMIT) },
          PAGE_TIMEOUT_MS,
          signal,
        );

        if (typeof data !== "object" || data === null || !("products" in data)) {
          throw new ShopifyError("PROXY_ERROR", "Invalid response from store.");
        }

        const responseObj = data as Record<string, unknown>;
        const productsField = responseObj["products"];
        if (!Array.isArray(productsField)) {
          throw new ShopifyError("PROXY_ERROR", "Invalid response from store.");
        }

        pageProducts = productsField as ShopifyProduct[];
        break;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") throw err;
        if (attempt === MAX_RETRIES) throw err;
        await delay(RETRY_DELAY_MS);
      }
    }

    if (pageProducts === null || pageProducts.length === 0) {
      break;
    }

    products.push(...pageProducts);
    onProgress(products.length, 0);
    page++;

    if (pageProducts.length < PAGE_LIMIT) {
      break;
    }

    await delay(PAGE_DELAY_MS);
  }

  return products;
}

const COLLECTIONS_TIMEOUT_MS = 15_000;

/** Fetch the store's published collections from the proxy. */
export async function fetchCollections(
  domain: string,
  signal?: AbortSignal,
): Promise<ShopifyCollection[]> {
  const data = await proxyFetch(
    "/api/collections",
    { store: domain },
    COLLECTIONS_TIMEOUT_MS,
    signal,
  );

  if (typeof data !== "object" || data === null || !("collections" in data)) {
    return [];
  }

  const responseObj = data as Record<string, unknown>;
  const collectionsField = responseObj["collections"];
  if (!Array.isArray(collectionsField)) {
    return [];
  }

  return collectionsField as ShopifyCollection[];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
