import type { ShopifyProduct } from "../types/shopify-types.js";
import { parsePrice } from "./price-utils.js";

const DB_NAME = "shopify-viewer-history";
const DB_VERSION = 1;
const STORE_NAME = "snapshots";

export interface PriceSnapshot {
  domain: string;
  timestamp: string;
  products: ProductPriceEntry[];
}

export interface ProductPriceEntry {
  id: number;
  title: string;
  handle: string;
  minPrice: number;
  available: boolean;
}

export interface PriceChange {
  id: number;
  title: string;
  handle: string;
  oldPrice: number;
  newPrice: number;
  diff: number;
  wasAvailable: boolean;
  nowAvailable: boolean;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objStore = db.createObjectStore(STORE_NAME, { keyPath: ["domain", "timestamp"] });
        objStore.createIndex("domain", "domain", { unique: false });
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

function productsToEntries(products: ShopifyProduct[]): ProductPriceEntry[] {
  return products.map((p) => ({
    id: p.id,
    title: p.title,
    handle: p.handle,
    minPrice: Math.min(...p.variants.map((v) => parsePrice(v.price))),
    available: p.variants.some((v) => v.available),
  }));
}

export async function saveSnapshot(domain: string, products: ShopifyProduct[]): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const snapshot: PriceSnapshot = {
      domain,
      timestamp: new Date().toISOString(),
      products: productsToEntries(products),
    };
    store.put(snapshot);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => {
        resolve();
      };
      tx.onerror = () => {
        reject(tx.error);
      };
    });
    db.close();
  } catch {
    // IndexedDB unavailable
  }
}

export async function getSnapshots(domain: string): Promise<PriceSnapshot[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("domain");
    const request = index.getAll(domain);
    const result = await new Promise<PriceSnapshot[]>((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result as PriceSnapshot[]);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
    db.close();
    return result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch {
    return [];
  }
}

export function computeChanges(
  previous: ProductPriceEntry[],
  current: ProductPriceEntry[],
): PriceChange[] {
  const prevMap = new Map(previous.map((p) => [p.id, p]));
  const changes: PriceChange[] = [];

  for (const curr of current) {
    const prev = prevMap.get(curr.id);
    if (prev === undefined) continue;

    if (prev.minPrice !== curr.minPrice || prev.available !== curr.available) {
      changes.push({
        id: curr.id,
        title: curr.title,
        handle: curr.handle,
        oldPrice: prev.minPrice,
        newPrice: curr.minPrice,
        diff: curr.minPrice - prev.minPrice,
        wasAvailable: prev.available,
        nowAvailable: curr.available,
      });
    }
  }

  return changes.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}
