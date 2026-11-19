# shopify-viewer Design Document

## Overview

shopify-viewer is a client-side web application that fetches product data from any Shopify store's public `/products.json` endpoint and renders it in multiple interactive views. It replaces a manual Google Apps Script workflow where the user had to hard-code a store URL, run the script, and work with the output in Google Sheets.

Users navigate to the app, enter a Shopify store URL, and immediately see product data in eight different views -- from detailed variant tables to visual card grids to statistical analysis, price history tracking, and multi-store comparison.

## Architecture

```
┌─────────────────────────┐     ┌──────────────────────────────────┐     ┌──────────────────┐
│   Browser (Frontend)    │────▶│  Cloudflare Worker (CORS Proxy)  │────▶│  Shopify Store    │
│   Svelte 5 + Tailwind   │◀────│  shopify-viewer-proxy            │◀────│  /products.json   │
│   GitHub Pages          │     │  .strongwind.workers.dev          │     │  /meta.json       │
└─────────────────────────┘     └──────────────────────────────────┘     │  /collections.json│
                                                                        └──────────────────┘
```

### Why a Proxy?

Shopify's public JSON endpoints do not return `Access-Control-Allow-Origin` headers. Any cross-origin `fetch()` from the browser is blocked. The Cloudflare Worker proxies the request server-side, adds CORS headers for our frontend origin, and returns the response.

### Monorepo Layout

```
shopify-viewer/
├── frontend/                  # Svelte 5 application
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api/           # Shopify API client, pagination logic
│   │   │   │   └── client.ts
│   │   │   ├── components/    # Svelte components
│   │   │   │   ├── Header.svelte
│   │   │   │   ├── Footer.svelte
│   │   │   │   ├── StoreInput.svelte
│   │   │   │   ├── ProgressBar.svelte
│   │   │   │   ├── ViewTabs.svelte
│   │   │   │   ├── SearchFilter.svelte
│   │   │   │   ├── shared/
│   │   │   │   │   ├── Badge.svelte
│   │   │   │   │   ├── ImageGallery.svelte
│   │   │   │   │   ├── PriceDisplay.svelte
│   │   │   │   │   ├── ProductImage.svelte
│   │   │   │   │   ├── SortableTable.svelte
│   │   │   │   │   └── VirtualList.svelte
│   │   │   │   └── views/
│   │   │   │       ├── ProductSummary.svelte
│   │   │   │       ├── ProductList.svelte
│   │   │   │       ├── CardGrid.svelte
│   │   │   │       ├── CategoryBreakdown.svelte
│   │   │   │       ├── PriceAnalysis.svelte
│   │   │   │       ├── PriceHistory.svelte
│   │   │   │       ├── StoreComparison.svelte
│   │   │   │       └── ExportPanel.svelte
│   │   │   ├── stores/        # Svelte stores (products, UI state)
│   │   │   │   └── app-store.svelte.ts
│   │   │   ├── types/         # TypeScript interfaces for API responses
│   │   │   │   └── shopify-types.ts
│   │   │   └── utils/         # Data transformation, export, formatting
│   │   │       ├── csv-export.ts
│   │   │       ├── data-transforms.ts
│   │   │       ├── image-utils.ts
│   │   │       ├── price-history.ts
│   │   │       ├── price-utils.ts
│   │   │       └── url-utils.ts
│   │   ├── app.css
│   │   ├── App.svelte         # Root component
│   │   └── main.ts            # Entry point
│   ├── public/                # Static assets copied to dist/
│   │   ├── favicon.svg
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   ├── manifest.json
│   │   ├── robots.txt
│   │   └── 404.html
│   ├── tests/
│   │   ├── unit/              # Vitest unit tests
│   │   │   ├── csv-export.test.ts
│   │   │   ├── data-transforms.test.ts
│   │   │   ├── image-utils.test.ts
│   │   │   ├── price-utils.test.ts
│   │   │   └── url-normalization.test.ts
│   │   └── e2e/               # Playwright e2e tests
│   │       └── app.spec.ts
│   ├── index.html
│   ├── svelte.config.js
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── playwright.config.ts
│   ├── eslint.config.js
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   └── package.json
├── worker/                    # Cloudflare Workers proxy
│   ├── src/
│   │   └── index.ts           # Worker entry point
│   ├── wrangler.toml          # Cloudflare config
│   ├── tsconfig.json
│   ├── package.json
│   └── pnpm-lock.yaml
├── docs/
│   ├── API.md                 # Shopify endpoint reference
│   ├── DESIGN.md              # This document
│   ├── CONSTITUTION.md        # Coding standards and quality gates
│   ├── SPEC.md                # Functional specification
│   └── TASKS.md               # Implementation work breakdown
├── .github/
│   ├── workflows/
│   │   ├── ci.yml             # Lint + typecheck + build + deploy
│   │   ├── codeql.yml         # CodeQL security scanning
│   │   └── worker-deploy.yml  # Cloudflare Worker deploy
│   ├── dependabot.yml
│   └── PULL_REQUEST_TEMPLATE.md
├── .editorconfig
├── .prettierrc.json
├── .prettierignore
├── .gitattributes
├── .yamllint.yml
├── Makefile
├── CLAUDE.md
├── CHANGELOG.md
├── SECURITY.md
├── LICENSE
├── README.md
├── package.json               # Root workspace package.json
├── pnpm-workspace.yaml        # Workspace packages (frontend, worker)
└── pnpm-lock.yaml             # Workspace lockfile (root, frontend, worker)
```

### Vanilla Svelte + Vite (Not SvelteKit)

This is a single-page app with tab-based views -- no page-level routing needed. Vanilla Svelte with Vite keeps the build simple and avoids SvelteKit's adapter/routing overhead. If routing becomes necessary later (e.g., `/store/<domain>` URLs), migrate to SvelteKit with `adapter-static` at that point.

## Data Flow

### 1. Store URL Input

User enters a URL in any of these formats:

- `lttstore.com`
- `www.lttstore.com`
- `https://www.lttstore.com`
- `https://www.lttstore.com/products.json`
- `lttstore.myshopify.com`

The app normalizes this to a base domain via `normalizeDomain()` in `url-utils.ts`, then constructs the API URL: `https://<domain>/products.json`.

### 2. Store Validation

Before fetching products, hit `/meta.json` through the proxy:

- Confirms the target is a Shopify store (non-Shopify sites won't have this endpoint).
- Retrieves `published_products_count` for progress estimation.
- Retrieves `name` and `currency` for display context.
- The `money_format` field is not parsed -- price formatting uses `Intl.NumberFormat` with the `currency` code instead.

### 3. Product Fetching

Paginate through `/products.json?limit=250&page=N`:

- Start at page 1.
- Accumulate products into a reactive Svelte store.
- Show a progress bar: `fetchedProducts / publishedProductsCount`.
- Stop when the response contains an empty `products` array or fewer than 250 products.
- Client-side pacing: minimum 500ms between page requests. Retry: 1 retry per failed page with 2s delay.
- AbortController support: user can submit a new store URL to cancel the current fetch.

### 4. Post-Fetch Actions

After products are loaded:

- Price snapshot saved to IndexedDB via `saveSnapshot()` for history tracking.
- Collections fetched from `/collections.json` (non-blocking, via `void fetchCollections().then()`).
- Store added to recent stores in localStorage.
- URL params updated via `history.replaceState`.

### 5. Data Transformation

Raw API data is transformed into view-specific structures via pure functions in `data-transforms.ts`:

| View               | Transformation                                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product Summary    | Aggregate: one row per product. Compute lowest variant price. Derive `available` from any-variant-available.                                                   |
| Product List       | Flatten: one row per variant. Parse prices to numbers. Replace "Default Title" with empty.                                                                     |
| Card Grid          | Group by product. Select first image or variant featured_image. Compute price range string. Three-state stock badge (In Stock / Out of Stock / Limited Stock). |
| Category Breakdown | Group by `product_type`. Count products, variants. Compute in-stock percentage, price range per category. Also displays fetched collections in a table.        |
| Price Analysis     | Compute distribution histogram, sale items (where `compare_at_price` > `price`), average/median/min/max by category.                                           |
| Price History      | Diff IndexedDB snapshots: compare current product prices and availability against a previous visit.                                                            |
| Store Comparison   | Fetch a second store's products and compute side-by-side metrics: product count, variant count, avg price, in-stock rate, categories, price range.             |
| CSV/JSON Export    | Serialize current view's data to downloadable file.                                                                                                            |

### 6. Search and Filtering

A `SearchFilter` component provides client-side filtering on three axes:

- **Text search:** matches against product title, product_type, vendor, and tags (case-insensitive)
- **Category dropdown:** filter by product_type
- **Stock filter:** All Stock / In Stock / Out of Stock

Filters apply to the Summary, Products, and Cards views. The filter state is managed in `App.svelte` as reactive `$state` variables, and filtered versions of the data arrays are computed as `$derived` values.

### 7. State Management

State is managed in `app-store.svelte.ts` using Svelte 5 runes at the module level, exported as a single `store` object with getter properties and setter methods:

```typescript
let products = $state<ShopifyProduct[]>([]);
let collections = $state<ShopifyCollection[]>([]);
let meta = $state<ShopifyMeta | null>(null);
let domain = $state("");
let appState = $state<AppState>({ status: "idle" });
let activeView = $state<ViewId>("summary");
let fetchedAt = $state<Date | null>(null);
```

`AppState` is a discriminated union type:

```typescript
type AppState =
  | { status: "idle" }
  | { status: "validating" }
  | { status: "fetching_meta" }
  | { status: "fetching_products"; progress: FetchProgress }
  | { status: "loaded" }
  | { status: "error"; code: ErrorCode; message: string; partialProducts: number };
```

Derived values via `$derived`:

```typescript
const productSummaries = $derived(domain !== "" ? toProductSummaries(products, domain) : []);
const productListRows = $derived(domain !== "" ? toProductListRows(products, domain) : []);
const categoryGroups = $derived(toCategoryGroups(productSummaries, products));
const priceAnalysis = $derived(products.length > 0 ? toPriceAnalysis(products) : null);
```

### 8. URL Params

The app reads and writes URL search params for deep-linking:

| Param   | Example        | Description               |
| ------- | -------------- | ------------------------- |
| `store` | `lttstore.com` | Auto-fetches on page load |
| `view`  | `cards`        | Active view tab           |

Example: `https://strongwind.dev/shopify-viewer/?store=lttstore.com&view=cards`

Valid `view` values: `summary`, `products`, `cards`, `categories`, `analysis`, `history`, `compare`, `export`.

### 9. localStorage

Recent stores are persisted in `localStorage` under key `shopify-viewer-recent`:

```json
[
  { "domain": "lttstore.com", "name": "Linus Tech Tips Store", "lastVisited": "2026-07-22T..." },
  { "domain": "kith.com", "name": "KITH", "lastVisited": "2026-07-20T..." }
]
```

Capped at 20 entries. Displayed as a dropdown/suggestions when the URL input is focused.

### 10. IndexedDB (Price History)

Price snapshots are stored in IndexedDB (`shopify-viewer-history` database, `snapshots` object store) for price tracking:

- Composite key: `[domain, timestamp]`
- Index on `domain` for fast lookups
- Each snapshot contains: domain, timestamp, and an array of `ProductPriceEntry` objects (id, title, handle, minPrice, available)
- Saved automatically on each successful product fetch
- Queried by the History tab to compute diffs between visits

## Component Architecture

```
App.svelte
├── Header.svelte              # App title, theme toggle, GitHub link
├── StoreInput.svelte          # URL input, recent stores dropdown, fetch button
├── ProgressBar.svelte         # Fetch progress indicator (aria-live)
├── ViewTabs.svelte            # Tab bar for 8 views (role=tablist)
├── SearchFilter.svelte        # Text search + category dropdown + stock filter
├── views/                     # (inside role=tabpanel container)
│   ├── ProductSummary.svelte  # Sortable paginated table of products (one row each)
│   ├── ProductList.svelte     # Sortable paginated table of all variants
│   ├── CardGrid.svelte        # Visual product cards with images + gallery trigger
│   ├── CategoryBreakdown.svelte  # Category groups with stats + collections table
│   ├── PriceAnalysis.svelte   # Price statistics and charts
│   ├── PriceHistory.svelte    # IndexedDB snapshot diffs, price/stock change tracking
│   ├── StoreComparison.svelte # Side-by-side store comparison with secondary fetch
│   └── ExportPanel.svelte     # CSV/JSON download buttons
├── shared/
│   ├── SortableTable.svelte   # Generic sortable table with pagination (100 rows/page)
│   ├── Badge.svelte           # In-stock/out-of-stock/limited badge
│   ├── PriceDisplay.svelte    # Formatted price with sale indicator
│   ├── ProductImage.svelte    # Lazy-loaded product image with fallback
│   ├── ImageGallery.svelte    # Fullscreen lightbox with keyboard nav
│   └── VirtualList.svelte     # (unused -- pagination used instead)
└── Footer.svelte              # Attribution, last fetch timestamp
```

## Cloudflare Worker Proxy

### Request Flow

```
Browser → GET /api/products?store=lttstore.com&page=1&limit=250
       → Worker validates domain, constructs Shopify URL
       → Worker fetches https://www.lttstore.com/products.json?limit=250&page=1
       → Worker returns response with CORS headers
```

### Worker Endpoints

| Method | Path               | Description                                                 |
| ------ | ------------------ | ----------------------------------------------------------- |
| `GET`  | `/api/products`    | Proxy `/products.json` with `store`, `page`, `limit` params |
| `GET`  | `/api/meta`        | Proxy `/meta.json` with `store` param                       |
| `GET`  | `/api/collections` | Proxy `/collections.json` with `store` param                |
| `GET`  | `/health`          | Health check, returns `{"ok": true}`                        |

### Security

- **Domain validation:** Regex-based domain format check plus private IP rejection (localhost, 10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x, IPv6). No open relay.
- **CORS origin restriction:** Allows `https://strongwind.dev`, `https://www.strongwind.dev`, `https://strongwind1.github.io`, and `http://localhost:*` for local development. All other origins receive `403 Forbidden`.
- **Shopify validation:** Verifies upstream response `Content-Type` is `application/json` before forwarding. Non-JSON responses (password-protected stores, Cloudflare challenge pages) are rejected with `NOT_SHOPIFY` error.
- **Input sanitization:** Only the `store` query parameter is extracted. Only explicitly allowed params (`page`, `limit` for products) are forwarded upstream.
- **No credential forwarding:** Worker sends only `Accept` and `User-Agent` headers upstream. No cookies or auth forwarded.
- **Response caching:** Cloudflare Cache API with 5-minute TTL, keyed by `domain + endpoint + params` (origin-independent). Non-blocking cache writes via `ctx.waitUntil()`.
- **www fallback:** If the initial request to a domain fails, retry with `www.` prepended (or stripped). Some Shopify stores only resolve with or without `www.`.

## Theme

Dark/light theme toggle:

- Respect `prefers-color-scheme` by default.
- User can override via toggle button.
- Persist choice in `localStorage` key `shopify-viewer-theme`.
- `<html>` element gets `data-theme="light"` or `data-theme="dark"` attribute.
- Tailwind `darkMode: "selector"` with selector `[data-theme="dark"]`.

## Responsive Design

- **Desktop (>=1024px):** Full table views with pagination, 4 column card grid, side-by-side price analysis.
- **Tablet (768px--1023px):** 3 column card grid, horizontally scrollable tables.
- **Mobile (<768px):** Single or 2 column card grid, horizontally scrollable tables, icon-only tab labels.

## Error Handling

| Error                         | User-Facing Message                                                       |
| ----------------------------- | ------------------------------------------------------------------------- |
| Invalid URL                   | "Enter a valid Shopify store URL (e.g., lttstore.com)"                    |
| Store not found / not Shopify | "This doesn't appear to be a Shopify store. Check the URL and try again." |
| CORS/proxy failure            | "Unable to reach the proxy server. Please try again in a moment."         |
| Rate limited (429)            | "Too many requests. Please wait a moment and try again."                  |
| Fetch timeout                 | "The store took too long to respond."                                     |
| Empty store                   | "This store has no published products."                                   |
| Unknown error                 | "Something went wrong. Please try again."                                 |

## Performance

- **Lazy image loading:** `loading="lazy"` on all product images via the ProductImage component.
- **Client-side pagination:** SortableTable paginates at 100 rows per page to avoid DOM bloat. Virtual scrolling was initially attempted (VirtualList component exists) but abandoned because it broke HTML table structure -- pagination proved more effective and accessible.
- **CDN thumbnails:** Product images use Shopify CDN URL suffix (`_400x400`) for resized thumbnails in card view, reducing bandwidth.
- **Paced fetching:** 500ms minimum delay between product page requests to avoid triggering Shopify/Cloudflare rate limits.
- **Edge caching:** Cloudflare Worker caches upstream responses for 5 minutes, reducing load on Shopify stores for popular queries.
- **Non-blocking post-fetch:** Collections fetch and price snapshot save are fire-and-forget (`void promise.then()`), keeping the main UI responsive after products load.
