# shopify-viewer Implementation Tasks

Work breakdown for building shopify-viewer from scratch. Tasks are ordered by dependency — earlier tasks unblock later ones. Each task includes acceptance criteria.

## Phase 0 — Project Scaffolding

### T-001: Initialize repository

- [ ] `git init` with `.gitignore` (node_modules, dist, .wrangler, .env)
- [ ] Add LICENSE (Apache-2.0)
- [ ] Add SECURITY.md
- [ ] Add CHANGELOG.md (empty, keep-a-changelog format)
- [ ] Add .editorconfig
- [ ] Add .prettierrc.json and .prettierignore
- [ ] Add Makefile with all standard targets
- [ ] Commit as `chore: initialize repository`

**Acceptance:** `git log` shows initial commit. Makefile targets listed with `make help`.

### T-002: Scaffold frontend (Svelte 5 + Vite + TypeScript)

- [ ] Create `/frontend` with `pnpm create vite@latest` using Svelte + TypeScript template
- [ ] Configure `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
- [ ] Install and configure Tailwind CSS (PostCSS, `tailwind.config.js`, base styles)
- [ ] Install Prettier plugins: `prettier-plugin-svelte`, `prettier-plugin-tailwindcss`
- [ ] Install ESLint: `@eslint/js`, `typescript-eslint`, `eslint-plugin-svelte`
- [ ] Create `eslint.config.js` with strict rule set per CONSTITUTION.md
- [ ] Install `svelte-check`
- [ ] Install Vitest and configure `vitest.config.ts`
- [ ] Install Playwright and configure `playwright.config.ts`
- [ ] Install `lucide-svelte` for icons
- [ ] Create `frontend/tests/unit/` and `frontend/tests/e2e/` directories
- [ ] Verify `make check` passes on the empty scaffold
- [ ] Commit as `chore: scaffold frontend with Svelte 5, Tailwind, and tooling`

**Acceptance:** `pnpm dev` serves a blank page. `make lint`, `make typecheck`, `make build` all pass. `pnpm exec vitest run` and `pnpm exec playwright test` run (with zero tests).

### T-003: Scaffold Cloudflare Worker

- [ ] Create `/worker` with `pnpm create cloudflare@latest` or manual setup
- [ ] Configure `wrangler.toml` with project name, compatibility date, routes
- [ ] Add TypeScript config (`tsconfig.json` with strict mode, `@cloudflare/workers-types`)
- [ ] Create minimal `src/index.ts` that returns `{"ok": true}` on `/health`
- [ ] Verify `pnpm exec wrangler deploy --dry-run` succeeds
- [ ] Commit as `chore: scaffold Cloudflare Worker proxy`

**Acceptance:** `wrangler dev` serves `/health` locally. Dry-run deploy succeeds.

### T-004: CI/CD workflows

- [ ] Create `.github/workflows/ci.yml` (lint + typecheck + build jobs)
- [ ] Create `.github/workflows/deploy.yml` (GitHub Pages deploy on main push)
- [ ] Create `.github/workflows/codeql.yml` (JavaScript/TypeScript + Actions analysis)
- [ ] Create `.github/workflows/worker-deploy.yml` (Cloudflare Worker deploy on `/worker` changes)
- [ ] Create `.github/dependabot.yml` (npm ecosystem for pnpm lockfile + github-actions)
- [ ] Create `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] All actions SHA-pinned, `persist-credentials: false`, `set -euo pipefail`, `timeout-minutes`
- [ ] CI jobs: lint → typecheck → test (vitest + playwright) → build (build depends on test passing)
- [ ] Commit as `ci: add CI, deploy, CodeQL, and worker workflows`

**Acceptance:** Push to a test branch triggers CI. All jobs pass on the scaffold.

## Phase 1 — Core Data Layer

### T-005: Unit tests for URL normalization and data transforms

- [ ] Create `frontend/tests/unit/url-normalization.test.ts` — test all accepted/rejected inputs from SPEC.md
- [ ] Create `frontend/tests/unit/price-utils.test.ts` — test price parsing, Intl.NumberFormat formatting, sale detection
- [ ] Create `frontend/tests/unit/data-transforms.test.ts` — test Product → ProductSummary, Product → ProductListRow, Product → CategoryGroup, Product → PriceAnalysis with fixture data
- [ ] Create `frontend/tests/unit/csv-export.test.ts` — test RFC 4180 compliance, BOM, quoting, CRLF
- [ ] Create `frontend/tests/unit/image-utils.test.ts` — test CDN thumbnail URL transformation
- [ ] Create `frontend/tests/fixtures/` with sample Shopify API response JSON (captured from a real store, anonymized if needed)
- [ ] Commit as `test: add unit tests for core data transformations`

**Acceptance:** `pnpm exec vitest run` passes. Coverage covers all pure utility functions. Tests use real Shopify response shapes from fixtures.

### T-006: TypeScript types for Shopify API

- [ ] Create `frontend/src/lib/types/shopify-types.ts`
- [ ] Define interfaces: `ShopifyProduct`, `ShopifyVariant`, `ShopifyImage`, `ShopifyOption`, `ShopifyMeta`
- [ ] Define response wrapper types: `ProductsResponse`, `MetaResponse`
- [ ] Define application types: `ProductSummary`, `CategoryGroup`, `PriceStats`, `RecentStore`
- [ ] All fields match API.md schema. Nullable fields use `| null`.
- [ ] Commit as `feat: add TypeScript types for Shopify API responses`

**Acceptance:** Types compile. No `any`. Every field from API.md is represented.

### T-007: Cloudflare Worker proxy implementation

- [ ] Implement `/api/products` endpoint: validate `store` param, construct Shopify URL, fetch, return with CORS headers
- [ ] Implement `/api/meta` endpoint: same pattern for `/meta.json`
- [ ] Implement `/api/collections` endpoint: same pattern for `/collections.json`
- [ ] Domain validation: parse with URL constructor, reject non-domain input, reject private IPs
- [ ] Shopify validation: check response headers for Shopify markers (`x-shopify-stage`, etc.) or verify response shape
- [ ] CORS: only allow `https://strongwind1.github.io` origin (and `http://localhost:*` for dev)
- [ ] Error responses: structured JSON `{"error": "message", "code": "ERROR_CODE"}`
- [ ] Rate limiting: basic per-IP rate limiting using Cloudflare's built-in tools
- [ ] Response caching: cache upstream Shopify responses for 5 minutes, keyed by store domain + endpoint + page. Use Cloudflare Cache API.
- [ ] www fallback: if the upstream request fails, retry with `www.` prepended (or stripped if already present)
- [ ] Commit as `feat: implement Cloudflare Worker CORS proxy`

**Acceptance:** `curl` to local wrangler dev returns proxied Shopify data for a known store. Non-Shopify domains rejected. Wrong CORS origin rejected. Second request within 5 minutes is served from cache. Domain with/without `www.` resolves correctly.

### T-008: Frontend API client

- [ ] Create `frontend/src/lib/api/client.ts`
- [ ] `fetchMeta(domain: string): Promise<ShopifyMeta>` — fetch store metadata via proxy
- [ ] `fetchProducts(domain: string, onProgress: (current: number, total: number) => void): Promise<ShopifyProduct[]>` — paginate through all products, report progress
- [ ] URL normalization: accept various input formats, extract domain
- [ ] Response validation: type guard functions to validate API responses match expected shape
- [ ] Error handling: typed error classes (`StoreNotFoundError`, `ProxyError`, `RateLimitError`)
- [ ] Commit as `feat: add Shopify API client with pagination and progress`

**Acceptance:** Unit tests pass for URL normalization. Integration test against a real store (via proxy) fetches all products.

### T-009: Svelte stores for application state

- [ ] Create `frontend/src/lib/stores/product-store.svelte.ts` (or use runes in a module)
- [ ] `products` — `$state<ShopifyProduct[]>([])`
- [ ] `uiState` — `$state<UIState>` (storeUrl, activeView, loading, error, storeMeta, fetchProgress)
- [ ] `recentStores` — `$state<RecentStore[]>` backed by localStorage
- [ ] Derived: `productSummaries`, `categoryBreakdown`, `priceAnalysis` via `$derived`
- [ ] URL param sync: read `store` and `view` from URL on load, write on state change
- [ ] localStorage sync: read/write recent stores with error handling for blocked storage
- [ ] Commit as `feat: add reactive stores for products and UI state`

**Acceptance:** State changes propagate to derived values. URL params update on state change. localStorage persists across page reloads.

## Phase 2 — UI Components

### T-010: App shell and layout

- [ ] `App.svelte` — top-level layout with header, main content, footer
- [ ] `Header.svelte` — app title ("Shopify Viewer"), theme toggle, GitHub link
- [ ] `Footer.svelte` — last fetch timestamp, link to repo
- [ ] Dark/light theme toggle: respect `prefers-color-scheme`, persist in localStorage, Tailwind `dark:` classes
- [ ] CSP meta tag in `index.html` per CONSTITUTION.md
- [ ] Responsive layout: max-width container, padding for mobile
- [ ] Commit as `feat: add app shell with header, footer, and theme toggle`

**Acceptance:** Dev server shows app shell. Theme toggle switches between light and dark. Responsive at all breakpoints.

### T-011: Store URL input

- [ ] `StoreInput.svelte` — text input with submit button
- [ ] URL validation on submit (client-side, before API call)
- [ ] Recent stores dropdown (populated from localStorage, shown on focus)
- [ ] Loading state: disable input + show spinner during fetch
- [ ] Error display: inline error message below input
- [ ] Debounced input (no auto-fetch on type — explicit submit only)
- [ ] Commit as `feat: add store URL input with recent stores dropdown`

**Acceptance:** Enter "lttstore.com" → triggers fetch. Recent stores appear on focus. Invalid URLs show error.

### T-012: Progress bar

- [ ] `ProgressBar.svelte` — animated progress bar during product fetch
- [ ] Shows "Fetching products... X of ~Y" with percentage
- [ ] Indeterminate mode when total is unknown (meta.json fetch failed)
- [ ] Hides when not loading
- [ ] Commit as `feat: add progress bar for product fetching`

**Acceptance:** Progress bar animates during fetch. Shows accurate count. Disappears on completion.

### T-013: View tabs

- [ ] `ViewTabs.svelte` — tab bar with icons/labels for each view
- [ ] Tabs: Summary, Products, Cards, Categories, Analysis, Export
- [ ] Active tab highlighted. URL param `view` updated on switch.
- [ ] Disabled/hidden when no products loaded
- [ ] Responsive: horizontal scroll on mobile if needed
- [ ] Commit as `feat: add view tab navigation`

**Acceptance:** Clicking tabs switches content. URL param reflects active view. Tabs disabled when no data.

### T-014: Product Summary view

- [ ] `ProductSummary.svelte` — table with one row per product
- [ ] Columns: Category, Product, Price (lowest variant), In Stock, URL
- [ ] Sortable by any column (click header to sort, click again to reverse)
- [ ] "In Stock" shows YES/NO badge (green/red)
- [ ] Price formatted with `Intl.NumberFormat` using the store's `currency` code from `meta.json`
- [ ] Product name links to store URL
- [ ] Out-of-stock rows have muted/highlighted background
- [ ] Commit as `feat: add product summary view`

**Acceptance:** Table renders all products. Sorting works on every column. Badges show correct stock status.

### T-015: Product List view (all variants)

- [ ] `ProductList.svelte` — table with one row per variant
- [ ] Columns: Category, Product, Option, Price, Original Price, In Stock, URL, Weight (g), Created
- [ ] Sortable by any column
- [ ] "Default Title" options replaced with empty/dash
- [ ] Original Price column shows sale indicator when `compare_at_price` differs from `price`
- [ ] Same styling conventions as Summary view
- [ ] Commit as `feat: add product list view with all variants`

**Acceptance:** Table renders all variants. "Default Title" suppressed. Sale prices highlighted.

### T-016: Card/Grid view

- [ ] `CardGrid.svelte` — responsive grid of product cards
- [ ] Each card: product image (first image or placeholder), title, price range, stock badge, category badge
- [ ] Images: lazy-loaded, Shopify CDN URL with size suffix for thumbnails (e.g., `_400x400`)
- [ ] Price range: "$19.99" for single price, "$19.99 - $49.99" for range
- [ ] Grid: 4 columns on desktop, 2 on tablet, 1 on mobile
- [ ] Click card to expand details (variants, description) or link to store
- [ ] Commit as `feat: add card grid view with product images`

**Acceptance:** Cards render with images. Grid is responsive. Lazy loading works (check network tab).

### T-017: Category Breakdown view

- [ ] `CategoryBreakdown.svelte` — collapsible sections grouped by `product_type`
- [ ] Each category header shows: category name, product count, variant count, in-stock percentage, price range
- [ ] Expand category to see product list within
- [ ] "Uncategorized" group for products with empty `product_type`
- [ ] Sorted by product count descending (largest categories first)
- [ ] Commit as `feat: add category breakdown view`

**Acceptance:** Products grouped correctly. Counts accurate. Collapse/expand works. Empty product_type handled.

### T-018: Price Analysis view

- [ ] `PriceAnalysis.svelte` — statistical summary and visualizations
- [ ] Stats: total products, total variants, average price, median price, min/max price
- [ ] Sale items: count of products where `compare_at_price > price`, average discount percentage
- [ ] Price by category: table of category → avg price, min, max, count
- [ ] Price distribution: simple bar chart or histogram (built with SVG, no charting library)
- [ ] Most/least expensive products (top 5 each)
- [ ] Commit as `feat: add price analysis view`

**Acceptance:** Stats are mathematically correct. Sale items identified correctly. Distribution chart renders.

### T-019: CSV/JSON export

- [ ] `ExportPanel.svelte` — download buttons for each data format
- [ ] CSV export: Product List format (all variants) and Product Summary format
- [ ] JSON export: raw API response and transformed summary data
- [ ] File naming: `{store-domain}-products-{date}.csv`, `{store-domain}-products-{date}.json`
- [ ] Uses `Blob` + `URL.createObjectURL` for client-side download
- [ ] Commit as `feat: add CSV and JSON export`

**Acceptance:** Downloaded CSV opens correctly in Excel/Sheets. JSON is valid. File names include store domain and date.

## Phase 3 — Shared Components

### T-020: SortableTable component

- [ ] `SortableTable.svelte` — reusable sortable table used by Product List and Product Summary
- [ ] Props: columns config (key, label, sortable, formatter), data array
- [ ] Sort state: current column + direction (asc/desc)
- [ ] Sort indicators in headers (arrow icons)
- [ ] Accessible: proper `<th scope="col">`, `aria-sort` attributes
- [ ] Commit as `refactor: extract reusable SortableTable component`

**Acceptance:** Both Product List and Product Summary use SortableTable. Sorting works identically in both.

### T-021: Shared UI components

- [ ] `Badge.svelte` — in-stock (green), out-of-stock (red), sale (orange) badges
- [ ] `PriceDisplay.svelte` — formatted price with optional compare-at price (strikethrough)
- [ ] `ProductImage.svelte` — lazy-loaded image with placeholder/fallback for missing images
- [ ] Commit as `refactor: extract shared Badge, PriceDisplay, and ProductImage components`

**Acceptance:** Components render correctly in all views that use them. Consistent styling.

## Phase 4 — Polish and Deployment

### T-022: End-to-end tests

- [ ] Create `frontend/tests/e2e/fetch-flow.spec.ts` — full flow: enter store URL → progress bar → products render in all views
- [ ] Create `frontend/tests/e2e/theme-toggle.spec.ts` — toggle persists across reload, respects OS preference
- [ ] Create `frontend/tests/e2e/url-params.spec.ts` — `?store=lttstore.com&view=cards` triggers auto-fetch and correct view
- [ ] Create `frontend/tests/e2e/export.spec.ts` — CSV and JSON downloads produce valid files
- [ ] Create `frontend/tests/e2e/error-states.spec.ts` — invalid URL, unreachable store, empty store errors render correctly
- [ ] Create `frontend/tests/e2e/keyboard-nav.spec.ts` — Tab through all interactive elements, Enter submits, Escape closes dropdown
- [ ] Configure Playwright to run against Vite dev server, headless Chromium in CI
- [ ] Commit as `test: add Playwright e2e tests`

**Acceptance:** `pnpm exec playwright test` passes. Tests exercise the complete user flow against a live Shopify store.

### T-023: Accessibility audit

- [ ] All interactive elements keyboard-navigable
- [ ] All images have alt text (product title as alt)
- [ ] Color contrast meets WCAG AA (check both themes)
- [ ] Screen reader testing: table headers associated with cells, badges have aria-label
- [ ] Focus management: focus moves to results after fetch completes
- [ ] Commit as `fix: accessibility improvements`

**Acceptance:** Lighthouse accessibility score ≥ 90. Keyboard-only navigation works end-to-end.

### T-024: Error states and edge cases

- [ ] Empty store (0 products) — show informative message, not blank views
- [ ] Single-product store — all views work with 1 product
- [ ] Large store (5000+ products) — performance acceptable, no UI freeze
- [ ] Store with no images — card view shows placeholder
- [ ] Store with no categories — category view handles gracefully
- [ ] All products out of stock — analysis view handles gracefully
- [ ] Proxy unavailable — clear error with retry button
- [ ] Commit as `fix: handle edge cases and error states`

**Acceptance:** Tested with at least 5 different Shopify stores of varying sizes.

### T-025: README and documentation

- [ ] README.md: project overview, screenshot, features, quick start, development setup, deployment guide
- [ ] Update CHANGELOG.md for initial release
- [ ] Verify all links in documentation work
- [ ] Commit as `docs: add README and update documentation`

**Acceptance:** A new contributor can clone, install, and run the dev server by following the README.

### T-026: Initial deployment

- [ ] Create GitHub repo `StrongWind1/shopify-viewer`
- [ ] Push all code
- [ ] Enable GitHub Pages (deploy from GitHub Actions)
- [ ] Deploy Cloudflare Worker (`wrangler deploy`)
- [ ] Update worker CORS origin to match deployed GitHub Pages URL
- [ ] Verify end-to-end: visit deployed site, enter a store URL, see products
- [ ] Commit as `chore: configure production deployment`

**Acceptance:** `https://strongwind1.github.io/shopify-viewer/` loads. Entering `lttstore.com` shows products in all views.

### T-027: GitHub repo configuration

- [ ] Branch protection on main: require PR, require CI pass, require signed commits
- [ ] Enable Dependabot alerts
- [ ] Enable CodeQL alerts
- [ ] Add repo description and topics
- [ ] Add homepage URL to repo settings

**Acceptance:** Direct pushes to main blocked. Dependabot and CodeQL active.

## Phase 5 — Future Enhancements (Backlog)

These are not part of the initial build. Track as GitHub Issues.

- [ ] Collection browsing: dropdown to filter by Shopify collection
- [ ] Search/filter within loaded products (client-side text search)
- [ ] Virtual scrolling for 5000+ product tables
- [ ] Price history tracking (diff products across visits, stored in IndexedDB)
- [ ] Shareable links with encoded store data (no proxy needed for revisits)
- [ ] PWA support (offline access to previously viewed stores)
- [ ] Multiple stores side-by-side comparison
- [ ] Product image gallery (click to enlarge, browse all images)
- [ ] Webhook/notification when products change or come back in stock
