# shopify-viewer Design Document

## Overview

shopify-viewer is a client-side web application that fetches product data from any Shopify store's public `/products.json` endpoint and renders it in multiple interactive views. It replaces a manual Google Apps Script workflow where the user had to hard-code a store URL, run the script, and work with the output in Google Sheets.

Users navigate to the app, enter a Shopify store URL, and immediately see product data in six different views — from detailed variant tables to visual card grids to statistical analysis.

## Architecture

```
┌─────────────────────────┐     ┌────────────────────────┐     ┌──────────────────┐
│   Browser (Frontend)    │────▶│  Cloudflare Worker      │────▶│  Shopify Store    │
│   Svelte 5 + Tailwind   │◀────│  (CORS Proxy)           │◀────│  /products.json   │
│   GitHub Pages          │     │  shopify-viewer-proxy.strongwind.workers.dev  │  /meta.json       │
└─────────────────────────┘     └────────────────────────┘     └──────────────────┘
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
│   │   │   ├── components/    # Svelte components
│   │   │   ├── stores/        # Svelte stores (products, UI state)
│   │   │   ├── types/         # TypeScript interfaces for API responses
│   │   │   └── utils/         # Data transformation, export, formatting
│   │   └── App.svelte         # Root component
│   ├── static/                # Static assets (favicon, robots.txt)
│   ├── svelte.config.js
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── pnpm-lock.yaml
├── worker/                    # Cloudflare Workers proxy
│   ├── src/
│   │   └── index.ts           # Worker entry point
│   ├── wrangler.toml          # Cloudflare config
│   ├── tsconfig.json
│   └── package.json
├── .github/
│   ├── workflows/
│   │   ├── ci.yml             # Lint + typecheck + build
│   │   ├── deploy.yml         # GitHub Pages deploy on main push
│   │   ├── codeql.yml         # CodeQL security scanning
│   │   └── worker-deploy.yml  # Cloudflare Worker deploy
│   ├── dependabot.yml
│   └── PULL_REQUEST_TEMPLATE.md
├── .editorconfig
├── .prettierrc.json
├── .prettierignore
├── eslint.config.js           # ESLint flat config
├── Makefile
├── API.md
├── DESIGN.md
├── CONSTITUTION.md
├── TASKS.md
├── CHANGELOG.md
├── SECURITY.md
├── LICENSE
└── README.md
```

### Vanilla Svelte + Vite (Not SvelteKit)

This is a single-page app with tab-based views — no page-level routing needed. Vanilla Svelte with Vite keeps the build simple and avoids SvelteKit's adapter/routing overhead. If routing becomes necessary later (e.g., `/store/<domain>` URLs), migrate to SvelteKit with `adapter-static` at that point.

## Data Flow

### 1. Store URL Input

User enters a URL in any of these formats:
- `lttstore.com`
- `www.lttstore.com`
- `https://www.lttstore.com`
- `https://www.lttstore.com/products.json`
- `lttstore.myshopify.com`

The app normalizes this to a base domain, then constructs the API URL: `https://<domain>/products.json`.

### 2. Store Validation

Before fetching products, hit `/meta.json` through the proxy:
- Confirms the target is a Shopify store (non-Shopify sites won't have this endpoint).
- Retrieves `published_products_count` for progress estimation.
- Retrieves `name`, `currency`, `money_format` for display context.

### 3. Product Fetching

Paginate through `/products.json?limit=250&page=N`:
- Start at page 1.
- Accumulate products into a reactive Svelte store.
- Show a progress bar: `fetchedProducts / publishedProductsCount`.
- Stop when the response contains an empty `products` array.
- Client-side pacing: minimum 500ms between page requests. The proxy adds additional server-side pacing if needed.

### 4. Data Transformation

Raw API data is transformed into view-specific structures:

| View | Transformation |
|---|---|
| Product List | Flatten: one row per variant. Parse prices to numbers. Replace "Default Title" with empty. |
| Product Summary | Aggregate: one row per product. Compute lowest variant price. Derive `available` from any-variant-available. |
| Card/Grid | Group by product. Select first image or variant featured_image. Compute price range string. |
| Category Breakdown | Group by `product_type`. Count products, variants. Compute in-stock percentage, price range per category. |
| Price Analysis | Compute distribution histogram, sale items (where `compare_at_price` > `price`), average/median/min/max by category. |
| CSV/JSON Export | Serialize current view's data to downloadable file. |

### 5. State Management

Two Svelte 5 `$state` runes at the top level:

```typescript
let products = $state<Product[]>([]);
let uiState = $state<UIState>({
  storeUrl: "",
  activeView: "summary",
  loading: false,
  error: null,
  storeMeta: null,
  fetchProgress: { current: 0, total: 0 },
});
```

Derived values via `$derived`:

```typescript
let productSummaries = $derived(computeSummaries(products));
let categoryBreakdown = $derived(computeCategories(products));
let priceAnalysis = $derived(computePriceAnalysis(products));
```

### 6. URL Params

The app reads and writes URL search params for deep-linking:

| Param | Example | Description |
|---|---|---|
| `store` | `lttstore.com` | Auto-fetches on page load |
| `view` | `cards` | Active view tab |

Example: `https://strongwind1.github.io/shopify-viewer/?store=lttstore.com&view=cards`

### 7. localStorage

Recent stores are persisted in `localStorage` under key `shopify-viewer-recent`:

```json
[
  { "domain": "lttstore.com", "name": "Linus Tech Tips Store", "lastVisited": "2026-07-22T..." },
  { "domain": "kith.com", "name": "KITH", "lastVisited": "2026-07-20T..." }
]
```

Capped at 20 entries. Displayed as a dropdown/suggestions when the URL input is focused.

## Component Architecture

```
App.svelte
├── Header.svelte              # App title, theme toggle, GitHub link
├── StoreInput.svelte          # URL input, recent stores dropdown, fetch button
├── ProgressBar.svelte         # Fetch progress indicator
├── ViewTabs.svelte            # Tab bar for switching views
├── views/
│   ├── ProductList.svelte     # Sortable table of all variants
│   ├── ProductSummary.svelte  # Sortable table of products (one row each)
│   ├── CardGrid.svelte        # Visual product cards with images
│   ├── CategoryBreakdown.svelte  # Category groups with stats
│   ├── PriceAnalysis.svelte   # Price statistics and charts
│   └── ExportPanel.svelte     # CSV/JSON download buttons
├── shared/
│   ├── SortableTable.svelte   # Reusable sortable table component
│   ├── Badge.svelte           # In-stock/out-of-stock badge
│   ├── PriceDisplay.svelte    # Formatted price with sale indicator
│   └── ProductImage.svelte    # Lazy-loaded product image with fallback
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

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/products` | Proxy `/products.json` with `store`, `page`, `limit` params |
| `GET` | `/api/meta` | Proxy `/meta.json` with `store` param |
| `GET` | `/api/collections` | Proxy `/collections.json` with `store` param |
| `GET` | `/health` | Health check, returns `{"ok": true}` |

### Security

- **Domain allowlist validation:** Only proxy requests to domains that resolve to Shopify IPs or return Shopify-specific headers (`x-shopify-stage`, `x-sorting-hat-shopid`). Reject requests to non-Shopify domains to prevent the proxy from being used as an open relay.
- **Rate limiting:** Cloudflare Workers rate limiting by client IP. Prevent abuse of the proxy.
- **CORS origin restriction:** Only allow requests from the GitHub Pages origin (`https://strongwind1.github.io`). Reject all other origins.
- **Input sanitization:** Validate and sanitize the `store` parameter. Allow only valid domain characters. Reject URLs, paths, query strings, or anything beyond a bare domain.
- **Response validation:** Verify the upstream response is JSON and has the expected shape before forwarding.
- **No credential forwarding:** Never forward cookies, authorization headers, or any credentials to the upstream Shopify store.
- **Response caching:** Cache upstream Shopify responses for 5 minutes (keyed by store domain + endpoint + page). Reduces Shopify rate limit pressure and improves response time for popular stores. Stale data within the TTL is acceptable — product catalogs don't change minute-to-minute.
- **www fallback:** If the initial request to a domain fails, retry with `www.` prepended (or stripped). Some Shopify stores only resolve with or without `www.`.

## Theme

Dark/light theme toggle following the same pattern as strongwind.dev:
- Respect `prefers-color-scheme` by default.
- User can override via toggle button.
- Persist choice in `localStorage`.
- Tailwind's `dark:` variant for all color classes.

## Responsive Design

- **Desktop (≥1024px):** Full table views, 3-4 column card grid, side-by-side price analysis.
- **Tablet (768px–1023px):** 2 column card grid, horizontally scrollable tables.
- **Mobile (<768px):** Single column card grid, stacked table rows or card-based table alternative.

## Error Handling

| Error | User-Facing Message |
|---|---|
| Invalid URL | "Enter a valid Shopify store URL (e.g., lttstore.com)" |
| Store not found / not Shopify | "This doesn't appear to be a Shopify store. Check the URL and try again." |
| CORS/proxy failure | "Unable to reach the store. The proxy may be temporarily unavailable." |
| Store password-protected | "This store is password-protected and cannot be accessed." |
| Rate limited (429) | "Too many requests. Please wait a moment and try again." |
| Empty store | "This store has no published products." |
| Partial fetch failure | "Fetched {N} of ~{total} products. Some pages could not be loaded." |

## Performance

- **Lazy image loading:** `loading="lazy"` on all product images. Only load images for cards in the viewport.
- **Virtual scrolling:** For stores with 1000+ products, consider virtual scrolling in the table views to avoid DOM bloat. Evaluate during implementation — may not be needed if pagination/filtering reduces visible rows.
- **Debounced URL input:** Debounce the store URL input to avoid triggering fetches on every keystroke.
- **Web Workers:** If data transformation for 5000+ products causes UI jank, move heavy computation (price analysis, sorting) to a Web Worker. Evaluate during implementation.
