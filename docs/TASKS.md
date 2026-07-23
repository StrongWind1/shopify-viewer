# shopify-viewer Implementation Tasks

Work breakdown for building shopify-viewer from scratch. Tasks are ordered by dependency -- earlier tasks unblock later ones. Each task includes acceptance criteria.

## Phase 0 -- Project Scaffolding

### T-001: Initialize repository

- [x] `git init` with `.gitignore` (node_modules, dist, .wrangler, .env)
- [x] Add LICENSE (Apache-2.0)
- [x] Add SECURITY.md
- [x] Add CHANGELOG.md (keep-a-changelog format)
- [x] Add .editorconfig
- [x] Add .prettierrc.json and .prettierignore
- [x] Add Makefile with all standard targets
- [x] Commit as `chore: initialize repository`

**Acceptance:** `git log` shows initial commit. Makefile targets listed with `make help`.

### T-002: Scaffold frontend (Svelte 5 + Vite + TypeScript)

- [x] Create `/frontend` with `pnpm create vite@latest` using Svelte + TypeScript template
- [x] Configure `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
- [x] Install and configure Tailwind CSS v4 (`@tailwindcss/vite` plugin -- no `tailwind.config.js` needed)
- [x] Install Prettier plugins: `prettier-plugin-svelte`, `prettier-plugin-tailwindcss`
- [x] Install ESLint: `@eslint/js`, `typescript-eslint`, `eslint-plugin-svelte`
- [x] Create `eslint.config.js` with strict rule set per CONSTITUTION.md
- [x] Install `svelte-check`
- [x] Install Vitest and configure `vitest.config.ts`
- [x] Install Playwright and configure `playwright.config.ts`
- [x] Install `@lucide/svelte` for icons
- [x] Create `frontend/tests/unit/` and `frontend/tests/e2e/` directories
- [x] Verify `make check` passes on the empty scaffold
- [x] Commit as `chore: scaffold frontend with Svelte 5, Tailwind, and tooling`

**Acceptance:** `pnpm dev` serves a blank page. `make lint`, `make typecheck`, `make build` all pass. `pnpm exec vitest run` and `pnpm exec playwright test` run (with zero tests).

### T-003: Scaffold Cloudflare Worker

- [x] Create `/worker` with manual setup
- [x] Configure `wrangler.toml` with project name, compatibility date, routes
- [x] Add TypeScript config (`tsconfig.json` with strict mode, `@cloudflare/workers-types`)
- [x] Create minimal `src/index.ts` that returns `{"ok": true}` on `/health`
- [x] Verify `pnpm exec wrangler deploy --dry-run` succeeds
- [x] Commit as `chore: scaffold Cloudflare Worker proxy`

**Acceptance:** `wrangler dev` serves `/health` locally. Dry-run deploy succeeds.

### T-004: CI/CD workflows

- [x] Create `.github/workflows/ci.yml` (lint + typecheck + build + deploy jobs)
- [x] Create `.github/workflows/codeql.yml` (JavaScript/TypeScript + Actions analysis)
- [x] Create `.github/workflows/worker-deploy.yml` (Cloudflare Worker deploy on `/worker` changes)
- [x] Create `.github/dependabot.yml` (npm ecosystem for pnpm lockfile + github-actions)
- [x] Create `.github/PULL_REQUEST_TEMPLATE.md`
- [x] All actions SHA-pinned, `persist-credentials: false`, `set -euo pipefail`, `timeout-minutes`
- [x] CI jobs: lint -> typecheck -> build (build depends on lint + typecheck passing), deploy on main push
- [x] Commit as `ci: add CI, deploy, CodeQL, and worker workflows`

**Acceptance:** Push to a test branch triggers CI. All jobs pass on the scaffold.

## Phase 1 -- Core Data Layer

### T-005: Unit tests for URL normalization and data transforms

- [x] Create `frontend/tests/unit/url-normalization.test.ts` -- test all accepted/rejected inputs from SPEC.md
- [x] Create `frontend/tests/unit/price-utils.test.ts` -- test price parsing, Intl.NumberFormat formatting, sale detection
- [x] Create `frontend/tests/unit/data-transforms.test.ts` -- test Product -> ProductSummary, Product -> ProductListRow, Product -> CategoryGroup, Product -> PriceAnalysis with fixture data
- [x] Create `frontend/tests/unit/csv-export.test.ts` -- test RFC 4180 compliance, BOM, quoting, CRLF
- [x] Create `frontend/tests/unit/image-utils.test.ts` -- test CDN thumbnail URL transformation
- [x] Commit as `test: add unit tests for core data transformations`

**Acceptance:** `pnpm exec vitest run` passes. Coverage covers all pure utility functions. Tests use real Shopify response shapes from fixtures.

### T-006: TypeScript types for Shopify API

- [x] Create `frontend/src/lib/types/shopify-types.ts`
- [x] Define interfaces: `ShopifyProduct`, `ShopifyVariant`, `ShopifyImage`, `ShopifyOption`, `ShopifyMeta`, `ShopifyCollection`
- [x] Define response wrapper types: `ShopifyProductsResponse`
- [x] Define application types: `ProductSummary`, `ProductListRow`, `CategoryGroup`, `PriceAnalysis`, `SaleAnalysis`, `CategoryPricing`, `PriceBucket`, `RankedProduct`, `RecentStore`, `FetchProgress`
- [x] Define state types: `AppState` (discriminated union), `ViewId` (8 view tabs), `ErrorCode`
- [x] All fields match API.md schema. Nullable fields use `| null`.
- [x] Commit as `feat: add TypeScript types for Shopify API responses`

**Acceptance:** Types compile. No `any`. Every field from API.md is represented.

### T-007: Cloudflare Worker proxy implementation

- [x] Implement `/api/products` endpoint: validate `store` param, construct Shopify URL, fetch, return with CORS headers
- [x] Implement `/api/meta` endpoint: same pattern for `/meta.json`
- [x] Implement `/api/collections` endpoint: same pattern for `/collections.json`
- [x] Domain validation: parse with regex, reject non-domain input, reject private IPs (10.x, 172.16-31.x, 192.168.x, 127.x, localhost, IPv6)
- [x] Shopify validation: verify upstream response Content-Type is `application/json`; reject non-JSON as `NOT_SHOPIFY`
- [x] CORS: allow `https://strongwind.dev`, `https://www.strongwind.dev`, `https://strongwind1.github.io`, and `http://localhost:*` for dev
- [x] Error responses: structured JSON `{"error": "message", "code": "ERROR_CODE"}`
- [x] Response caching: cache upstream Shopify responses for 5 minutes via Cloudflare Cache API, keyed by store domain + endpoint + page
- [x] www fallback: if the upstream request fails, retry with `www.` prepended (or stripped if already present)
- [x] Commit as `feat: implement Cloudflare Worker CORS proxy`

**Acceptance:** `curl` to local wrangler dev returns proxied Shopify data for a known store. Non-Shopify domains rejected. Wrong CORS origin rejected. Second request within 5 minutes is served from cache. Domain with/without `www.` resolves correctly.

### T-008: Frontend API client

- [x] Create `frontend/src/lib/api/client.ts`
- [x] `fetchMeta(domain: string, signal?: AbortSignal): Promise<ShopifyMeta>` -- fetch store metadata via proxy
- [x] `fetchAllProducts(domain: string, onProgress: (current: number, total: number) => void, signal?: AbortSignal): Promise<ShopifyProduct[]>` -- paginate through all products, report progress
- [x] `fetchCollections(domain: string, signal?: AbortSignal): Promise<ShopifyCollection[]>` -- fetch store collections
- [x] `validateStoreInput(input: string): string` -- normalize and validate domain, throw `ShopifyError` on invalid input
- [x] URL normalization via `normalizeDomain()` in `url-utils.ts`
- [x] Response validation: type guard (`isProxyError`) to detect proxy error responses
- [x] Error handling: `ShopifyError` class with `ErrorCode` union type (`INVALID_URL`, `STORE_NOT_FOUND`, `PROXY_ERROR`, `RATE_LIMITED`, `FETCH_TIMEOUT`, etc.)
- [x] Timeout handling: per-page timeout via `AbortController`, 10s for meta, 30s for product pages
- [x] Retry: 1 retry per failed product page with 2s delay
- [x] Pacing: 500ms minimum between product page requests
- [x] Proxy base URL: `https://shopify-viewer-proxy.strongwind.workers.dev`
- [x] Commit as `feat: add Shopify API client with pagination and progress`

**Acceptance:** Unit tests pass for URL normalization. Integration test against a real store (via proxy) fetches all products.

### T-009: Svelte stores for application state

- [x] Create `frontend/src/lib/stores/app-store.svelte.ts` using Svelte 5 runes in a module
- [x] `products` -- `$state<ShopifyProduct[]>([])`
- [x] `collections` -- `$state<ShopifyCollection[]>([])`
- [x] `meta` -- `$state<ShopifyMeta | null>(null)`
- [x] `domain` -- `$state("")`
- [x] `appState` -- `$state<AppState>` (discriminated union with statuses: idle, validating, fetching_meta, fetching_products, loaded, error)
- [x] `activeView` -- `$state<ViewId>("summary")` (8 tabs: summary, products, cards, categories, analysis, history, compare, export)
- [x] `fetchedAt` -- `$state<Date | null>(null)` using `SvelteDate` for reactivity
- [x] Derived: `productSummaries`, `productListRows`, `categoryGroups`, `priceAnalysis` via `$derived`
- [x] URL param sync: read `store` and `view` from URL on load, write on state change via `history.replaceState`
- [x] localStorage sync: read/write recent stores (max 20) with error handling for blocked storage
- [x] Exported as a single `store` object with getters and setter methods
- [x] Commit as `feat: add reactive stores for products and UI state`

**Acceptance:** State changes propagate to derived values. URL params update on state change. localStorage persists across page reloads.

## Phase 2 -- UI Components

### T-010: App shell and layout

- [x] `App.svelte` -- top-level layout with header, main content, footer
- [x] `Header.svelte` -- app title ("Shopify Viewer"), theme toggle, GitHub link
- [x] `Footer.svelte` -- last fetch timestamp, link to repo
- [x] Dark/light theme toggle: respect `prefers-color-scheme`, persist in localStorage, Tailwind `dark:` classes, `data-theme` attribute on `<html>`
- [x] CSP meta tag in `index.html` restricting script-src, connect-src, img-src
- [x] Referrer-policy meta tag (`no-referrer`)
- [x] Noscript fallback message
- [x] Open Graph and Twitter Card meta tags
- [x] Canonical URL link
- [x] Responsive layout: max-width container (`max-w-7xl`), padding for mobile
- [x] Commit as `feat: add app shell with header, footer, and theme toggle`

**Acceptance:** Dev server shows app shell. Theme toggle switches between light and dark. Responsive at all breakpoints.

### T-011: Store URL input

- [x] `StoreInput.svelte` -- text input with submit button
- [x] URL validation on submit (client-side, before API call)
- [x] Recent stores dropdown (populated from localStorage, shown on focus)
- [x] Loading state: disable input + show spinner during fetch
- [x] Error display: inline error message below input
- [x] Explicit submit only (no auto-fetch on type)
- [x] Commit as `feat: add store URL input with recent stores dropdown`

**Acceptance:** Enter "lttstore.com" -> triggers fetch. Recent stores appear on focus. Invalid URLs show error.

### T-012: Progress bar

- [x] `ProgressBar.svelte` -- animated progress bar during product fetch
- [x] Shows "Fetching products... X of ~Y" with percentage
- [x] Uses `aria-live` for screen reader announcements
- [x] Hides when not loading
- [x] Commit as `feat: add progress bar for product fetching`

**Acceptance:** Progress bar animates during fetch. Shows accurate count. Disappears on completion.

### T-013: View tabs

- [x] `ViewTabs.svelte` -- tab bar with icons/labels for each view
- [x] Tabs: Summary, Products, Cards, Categories, Analysis, History, Compare, Export (8 total)
- [x] Icons from `@lucide/svelte`: List, Table, LayoutGrid, FolderTree, BarChart3, History, GitCompareArrows, Download
- [x] Active tab highlighted. URL param `view` updated on switch.
- [x] `role="tablist"` on container, `role="tab"` + `aria-selected` on each button
- [x] Disabled/hidden when no products loaded
- [x] Responsive: horizontal scroll on mobile, icon-only on small screens (`hidden sm:inline` on labels)
- [x] Commit as `feat: add view tab navigation`

**Acceptance:** Clicking tabs switches content. URL param reflects active view. Tabs disabled when no data.

### T-014: Product Summary view

- [x] `ProductSummary.svelte` -- table with one row per product using SortableTable
- [x] Columns: Category, Product, Price (lowest variant), In Stock, URL
- [x] Sortable by any column (click header to sort, click again to reverse)
- [x] "In Stock" shows YES/NO badge (green/red) via Badge component
- [x] Price formatted with `Intl.NumberFormat` using the store's `currency` code from `meta.json`
- [x] Product name links to store URL
- [x] Out-of-stock rows have muted/highlighted background
- [x] Client-side pagination (100 rows per page) via SortableTable
- [x] Commit as `feat: add product summary view`

**Acceptance:** Table renders all products. Sorting works on every column. Badges show correct stock status.

### T-015: Product List view (all variants)

- [x] `ProductList.svelte` -- table with one row per variant using SortableTable
- [x] Columns: Category, Product, Option, Price, Original Price, In Stock, URL, Weight (g), Created
- [x] Sortable by any column
- [x] "Default Title" options replaced with empty/dash
- [x] Original Price column shows sale indicator when `compare_at_price` differs from `price`
- [x] Client-side pagination (100 rows per page) via SortableTable
- [x] Same styling conventions as Summary view
- [x] Commit as `feat: add product list view with all variants`

**Acceptance:** Table renders all variants. "Default Title" suppressed. Sale prices highlighted.

### T-016: Card/Grid view

- [x] `CardGrid.svelte` -- responsive grid of product cards
- [x] Each card: product image (first image or placeholder), title, price range, stock badge, category badge
- [x] Images: lazy-loaded via ProductImage component, Shopify CDN URL with size suffix for thumbnails (e.g., `_400x400`)
- [x] Price range: "$19.99" for single price, "$19.99 -- $49.99" for range (en dash)
- [x] Three-state stock badge: In Stock (green), Out of Stock (red), Limited Stock (yellow)
- [x] Grid: 4 columns on lg, 3 on md, 2 on sm, 1 on mobile
- [x] Click image area to open fullscreen ImageGallery lightbox (if product has images)
- [x] Photo count badge in bottom-right of image when multiple images exist
- [x] Card links to store product page in new tab
- [x] Commit as `feat: add card grid view with product images`

**Acceptance:** Cards render with images. Grid is responsive. Lazy loading works (check network tab).

### T-017: Category Breakdown view

- [x] `CategoryBreakdown.svelte` -- collapsible sections grouped by `product_type`
- [x] Each category header shows: category name, product count, variant count, in-stock percentage, price range
- [x] Expand category to see product list within
- [x] "Uncategorized" group for products with empty `product_type`
- [x] Sorted by product count descending (largest categories first)
- [x] Collections table: fetched from `/collections.json` and displayed below category groups with title, product count, and last updated date
- [x] Uses `SvelteSet` for tracking expanded state
- [x] Commit as `feat: add category breakdown view`

**Acceptance:** Products grouped correctly. Counts accurate. Collapse/expand works. Empty product_type handled. Collections table rendered.

### T-018: Price Analysis view

- [x] `PriceAnalysis.svelte` -- statistical summary and visualizations
- [x] Stats: total products, total variants, average price, median price, min/max price
- [x] Sale items: count of products where `compare_at_price > price`, average discount percentage
- [x] Price by category: table of category -> avg price, min, max, count
- [x] Price distribution: simple bar chart/histogram (built with SVG, no charting library)
- [x] Most/least expensive products (top 5 each)
- [x] Commit as `feat: add price analysis view`

**Acceptance:** Stats are mathematically correct. Sale items identified correctly. Distribution chart renders.

### T-019: CSV/JSON export

- [x] `ExportPanel.svelte` -- download buttons for each data format
- [x] CSV export: Product List format (all variants) and Product Summary format
- [x] JSON export: raw API response and transformed summary data
- [x] File naming: `{store-domain}-products-{date}.csv`, `{store-domain}-products-{date}.json`
- [x] Uses `Blob` + `URL.createObjectURL` for client-side download
- [x] Commit as `feat: add CSV and JSON export`

**Acceptance:** Downloaded CSV opens correctly in Excel/Sheets. JSON is valid. File names include store domain and date.

## Phase 3 -- Shared Components

### T-020: SortableTable component

- [x] `SortableTable.svelte` -- generic reusable sortable table with TypeScript generics
- [x] Props: columns config (key, label, sortable, align, sortValue), data array, cell snippet, pageSize (default 100)
- [x] Sort state: current column + direction (asc/desc), three-click cycle (asc -> desc -> default)
- [x] Sort indicators in headers (ChevronUp/ChevronDown icons from `@lucide/svelte`)
- [x] Client-side pagination: 100 rows per page with first/prev/next/last navigation buttons
- [x] Row count display: "1--100 of 342 rows"
- [x] Accessible: proper `<th scope="col">`, `aria-sort` attributes, `aria-label` on pagination buttons
- [x] Uses Svelte 5 `Snippet` for custom cell rendering (snippet named `cell`, not `children`)
- [x] Commit as `refactor: extract reusable SortableTable component`

**Acceptance:** Both Product List and Product Summary use SortableTable. Sorting and pagination work identically in both.

### T-021: Shared UI components

- [x] `Badge.svelte` -- in-stock (green), out-of-stock (red), limited (yellow) badges
- [x] `PriceDisplay.svelte` -- formatted price with optional compare-at price (strikethrough)
- [x] `ProductImage.svelte` -- lazy-loaded image with placeholder/fallback for missing images
- [x] `ImageGallery.svelte` -- fullscreen lightbox for product images with prev/next navigation, thumbnail strip, keyboard controls (Escape/Arrow), and click-outside-to-close
- [x] `VirtualList.svelte` -- exists in shared components but not used (replaced by SortableTable pagination)
- [x] Commit as `refactor: extract shared Badge, PriceDisplay, ProductImage, and ImageGallery components`

**Acceptance:** Components render correctly in all views that use them. Consistent styling.

## Phase 4 -- Polish and Deployment

### T-022: End-to-end tests

- [x] Create `frontend/tests/e2e/app.spec.ts` with 6 Playwright tests covering:
  - App shell loads (title, input, button visible)
  - Invalid URL shows error message
  - Theme toggle switches between light and dark and back
  - Full fetch flow: enter lttstore.com -> connecting state -> products load -> all 8 tabs work -> search filter -> category filter -> stock filter
  - URL params auto-fetch (`?store=lttstore.com&view=cards` triggers fetch)
  - Static assets served (favicon.svg, manifest.json)
- [x] Configure Playwright to run against `vite preview` server on port 4173, headless Chromium, 60s timeout per test, 1 retry
- [x] Commit as `test: add Playwright e2e tests`

**Acceptance:** `pnpm exec playwright test` passes. Tests exercise the complete user flow against a live Shopify store.

### T-023: Accessibility audit

- [x] All interactive elements keyboard-navigable
- [x] All images have alt text (product title as alt)
- [x] `role="tablist"` on tab container, `role="tab"` with `aria-selected` on tab buttons
- [x] `role="tabpanel"` with `aria-label` on active view container
- [x] `aria-label` on all inputs (Store URL, Search products, Filter by category, Filter by stock status)
- [x] `aria-live` on progress bar for screen reader announcements
- [x] `aria-sort` on sortable table columns
- [x] `aria-label` on pagination buttons (First page, Previous page, Next page, Last page)
- [x] `aria-modal` and `aria-label` on image gallery dialog
- [x] Focus management: keyboard controls in image gallery (Escape, ArrowLeft, ArrowRight)
- [x] Commit as `fix: accessibility improvements`

**Acceptance:** Keyboard-only navigation works end-to-end. Screen reader landmarks and labels present on all interactive elements.

### T-024: Error states and edge cases

- [x] Empty store (0 products) -- show informative message "This store has no published products"
- [x] Single-product store -- all views work with 1 product
- [x] Large store (5000+ products) -- client-side pagination (100 rows/page) prevents DOM bloat
- [x] Store with no images -- card view shows placeholder via ProductImage fallback
- [x] Store with no categories -- category view handles gracefully with "Uncategorized" group
- [x] All products out of stock -- analysis view handles gracefully
- [x] Proxy unavailable -- clear error with retry
- [x] AbortController cancellation when user submits new store during fetch
- [x] Commit as `fix: handle edge cases and error states`

**Acceptance:** Tested with at least 5 different Shopify stores of varying sizes.

### T-025: README and documentation

- [x] README.md: project overview, features, quick start, architecture, development setup
- [x] Update CHANGELOG.md for initial release
- [x] Verify all links in documentation work
- [x] Commit as `docs: add README and update documentation`

**Acceptance:** A new contributor can clone, install, and run the dev server by following the README.

### T-026: Initial deployment

- [x] Create GitHub repo `StrongWind1/shopify-viewer`
- [x] Push all code
- [x] Enable GitHub Pages (deploy from GitHub Actions via `ci.yml` deploy job)
- [x] Deploy Cloudflare Worker (`wrangler deploy`) to `shopify-viewer-proxy.strongwind.workers.dev`
- [x] Worker CORS allows `https://strongwind.dev`, `https://strongwind1.github.io`, and localhost origins
- [x] Verify end-to-end: visit deployed site, enter a store URL, see products
- [x] Commit as `chore: configure production deployment`

**Acceptance:** `https://strongwind.dev/shopify-viewer/` loads. Entering `lttstore.com` shows products in all views.

### T-027: GitHub repo configuration

- [x] Branch protection on main: require PR, require CI pass, require signed commits
- [x] Enable Dependabot alerts
- [x] Enable CodeQL alerts
- [x] Add repo description and topics
- [x] Add homepage URL to repo settings

**Acceptance:** Direct pushes to main blocked. Dependabot and CodeQL active.

## Phase 5 -- Additional Features (Originally Backlog)

These were originally planned as future enhancements but were implemented during the initial build.

### T-028: Search and filter

- [x] `SearchFilter.svelte` -- combined search and filter bar with text search, category dropdown, stock filter
- [x] Text search: filters products by title, product_type, vendor, and tags (case-insensitive)
- [x] Category dropdown: populated from product types, includes "All Categories" default
- [x] Stock filter: All Stock / In Stock / Out of Stock dropdown
- [x] Applied to Summary, Products, and Cards views (filterable views)
- [x] Filter state displayed in header: "142 products (47 shown)"
- [x] All filter inputs have `aria-label` attributes

**Acceptance:** Filters reduce displayed products across Summary, Products, and Cards views. Filters can be combined.

### T-029: Price history tracking (IndexedDB)

- [x] `frontend/src/lib/utils/price-history.ts` -- IndexedDB-backed price snapshot storage
- [x] `saveSnapshot(domain, products)` -- saves min-price and availability per product on each fetch
- [x] `getSnapshots(domain)` -- retrieves all historical snapshots for a domain, sorted newest first
- [x] `computeChanges(previous, current)` -- diffs two snapshots, returns list of price/stock changes
- [x] `PriceHistory.svelte` -- History tab showing diff between current and previous snapshots
- [x] Dropdown to select which historical snapshot to compare against
- [x] Each change shows: product title, old price -> new price, diff amount (green for decrease, red for increase), stock status changes (badges)
- [x] Empty state when no history or only one snapshot exists

**Acceptance:** Fetching a store twice creates two snapshots. History tab shows price and stock changes between visits.

### T-030: Store comparison

- [x] `StoreComparison.svelte` -- Compare tab for side-by-side store analysis
- [x] Secondary store input with fetch button
- [x] Comparison table: Total Products, Total Variants, Avg Price, In Stock %, Categories, Price Range
- [x] Per-store summary cards with product/variant counts and stock badges
- [x] Handles different currencies between stores
- [x] Clear comparison button

**Acceptance:** Enter two store URLs, see side-by-side comparison of catalog metrics.

### T-031: Image gallery lightbox

- [x] `ImageGallery.svelte` -- fullscreen modal for browsing product images
- [x] Keyboard navigation: Escape to close, ArrowLeft/ArrowRight to navigate
- [x] Click backdrop to close
- [x] Prev/next buttons with disabled state at boundaries
- [x] Thumbnail strip for direct image selection
- [x] Image counter: "1 / 5 -- Product Title"
- [x] `role="dialog"`, `aria-modal="true"`, `aria-label` for accessibility

**Acceptance:** Click product image in Cards view to open gallery. Navigate between images. Close via Escape or backdrop click.

### T-032: PWA support

- [x] `manifest.json` with app name, icons (SVG + PNG 192px + PNG 512px), theme color, start URL
- [x] Apple touch icon link
- [x] SVG favicon

**Acceptance:** `manifest.json` served. App installable on mobile browsers.

### T-033: Static pages and SEO

- [x] Custom `404.html` with dark-mode-aware styling and link back to app
- [x] `robots.txt` allowing all crawlers
- [x] Open Graph meta tags (og:type, og:title, og:description, og:url)
- [x] Twitter Card meta tags (summary type)
- [x] Canonical URL link

**Acceptance:** 404 page renders correctly in light and dark mode. Social previews show correct title/description.

## Remaining Backlog

These are not yet implemented. Track as GitHub Issues.

- [ ] Shareable links with encoded store data (no proxy needed for revisits)
- [ ] Webhook/notification when products change or come back in stock
- [ ] Collection-scoped product browsing (filter by Shopify collection)
