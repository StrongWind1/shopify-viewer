# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **8 interactive views:** Summary, Products, Cards, Categories, Analysis, History, Compare, Export
- **Cloudflare Worker proxy** at `shopify-viewer-proxy.strongwind.workers.dev` with CORS headers, domain validation, private IP rejection, www fallback, and 5-minute response caching via Cloudflare Cache API
- **Product Summary view** with sortable paginated table (one row per product, lowest variant price, stock badge)
- **Product List view** with sortable paginated table (one row per variant, price, original price, weight, created date)
- **Card Grid view** with responsive grid (1/2/3/4 columns), lazy-loaded Shopify CDN thumbnails, three-state stock badges (In Stock / Out of Stock / Limited Stock), and photo count overlay
- **Category Breakdown view** with collapsible category groups (product count, variant count, in-stock rate, price range), expand/collapse all, and fetched collections table
- **Price Analysis view** with summary statistics (average, median, min, max), sale analysis (discount detection, biggest discount, total savings), price-by-category table, SVG histogram, and top/bottom 5 products
- **Price History view** tracking price and stock changes across visits via IndexedDB snapshots, with snapshot comparison dropdown and per-product change cards showing price diffs and stock transitions
- **Store Comparison view** for side-by-side comparison of two stores on product count, variant count, average price, in-stock rate, categories, and price range
- **Export view** with CSV (RFC 4180 compliant, BOM for Excel) and JSON downloads for both product list and summary formats
- **Search and filter** component with text search (title, type, vendor, tags), category dropdown, and stock status filter applied to Summary, Products, and Cards views
- **Image gallery lightbox** triggered from card images with fullscreen display, prev/next navigation, thumbnail strip, keyboard controls (Escape, ArrowLeft, ArrowRight), and click-outside-to-close
- **SortableTable** generic component with TypeScript generics, column-level sort with three-click cycle (asc/desc/default), client-side pagination (100 rows/page), and `aria-sort` attributes
- **Shared components:** Badge (in-stock/out-of-stock/limited), PriceDisplay (formatted price with sale strikethrough), ProductImage (lazy-loaded with fallback)
- **API client** with paginated product fetching, meta/collections endpoints, 500ms request pacing, per-page retry with 2s delay, AbortController cancellation, and typed error classes
- **Svelte 5 reactive store** (`app-store.svelte.ts`) with `$state`/`$derived` runes, discriminated union AppState, derived transforms (summaries, list rows, categories, price analysis), URL param sync via `history.replaceState`, and localStorage recent stores (max 20)
- **Dark/light theme** toggle respecting `prefers-color-scheme`, persisted in localStorage, using `data-theme` attribute and Tailwind dark: classes
- **URL deep linking** with `?store=` and `?view=` parameters for auto-fetch and view selection
- **Content Security Policy** via meta tag restricting script-src, connect-src, img-src, and other directives
- **Referrer policy** (`no-referrer`) via meta tag
- **Noscript fallback** message for users without JavaScript
- **Open Graph and Twitter Card** meta tags for social link previews
- **PWA manifest** (`manifest.json`) with SVG favicon, PNG icons (192px, 512px), and apple-touch-icon
- **Custom 404 page** with dark-mode-aware styling
- **robots.txt** allowing all crawlers
- **Canonical URL** link element
- **Accessibility:** `role="tablist"`/`role="tab"`/`role="tabpanel"` on view navigation, `aria-label` on all inputs and buttons, `aria-live` on progress bar, `aria-sort` on table columns, `aria-modal` on image gallery, keyboard navigation throughout
- **Unit tests** (Vitest): URL normalization, price parsing/formatting, data transforms, CSV export (RFC 4180), image URL transformation
- **E2E tests** (Playwright, 6 tests): app shell loading, invalid URL error, theme toggle, full fetch flow with all 8 tabs and filters, URL param auto-fetch, static asset serving; run against `vite preview` server with headless Chromium
- **CI pipeline** (GitHub Actions): lint (Prettier + ESLint), typecheck (svelte-check + tsc), build, deploy to GitHub Pages on main push; all actions SHA-pinned, `persist-credentials: false`, `set -euo pipefail`, `timeout-minutes` on every job
- **CodeQL workflow** for JavaScript/TypeScript and Actions security scanning
- **Worker deploy workflow** for Cloudflare Worker deployment
- **Dependabot** configuration for npm and github-actions ecosystems
- **Makefile** with targets: install, dev, build, lint, format, typecheck, test, test-unit, test-e2e, check, clean, deploy-worker
