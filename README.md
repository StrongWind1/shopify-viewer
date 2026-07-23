# shopify-viewer

Browse and analyze product data from any Shopify store. Enter a store URL, fetch all products via the public `/products.json` endpoint, and explore the catalog through eight interactive views.

**Live:** [strongwind.dev/shopify-viewer](https://strongwind.dev/shopify-viewer/)

## Features

- **Product Summary** -- one row per product with lowest price and stock status
- **Product List** -- every variant with price, original price, weight, and creation date
- **Card Grid** -- visual product cards with images from the Shopify CDN, click to open fullscreen image gallery
- **Category Breakdown** -- products grouped by type with aggregate statistics, plus fetched store collections
- **Price Analysis** -- price distribution histogram, sale detection, per-category averages, top/bottom products
- **Price History** -- track price and stock changes across visits (stored in IndexedDB)
- **Store Comparison** -- compare two stores side by side on product count, pricing, stock, and categories
- **Export** -- download as CSV or JSON for offline analysis

Additional capabilities:

- **Search and filter** -- text search across product titles, types, vendors, and tags; category dropdown; stock filter
- **Client-side pagination** -- 100 rows per page for large catalogs
- **Image gallery** -- fullscreen lightbox with keyboard navigation (Escape, Arrow keys)
- **Dark/light theme** -- respects OS preference, toggleable, persisted
- **Recent stores** -- dropdown of previously visited stores, persisted in localStorage
- **Deep linking** -- `?store=lttstore.com&view=cards` auto-fetches and sets the active view
- **PWA manifest** -- installable on mobile with app icons
- **Accessibility** -- ARIA roles/labels on all interactive elements, keyboard-navigable

## Quick Start

```sh
# Install dependencies
cd frontend && pnpm install
cd ../worker && pnpm install

# Start the dev server
cd ../frontend && pnpm dev
```

## Architecture

```
Browser --> Cloudflare Worker (CORS proxy) --> Shopify Store /products.json
```

Shopify's public JSON endpoints don't include CORS headers. The Cloudflare Worker at `shopify-viewer-proxy.strongwind.workers.dev` proxies requests server-side, adds the appropriate headers, and caches responses for 5 minutes.

| Component | Stack                                       |
| --------- | ------------------------------------------- |
| Frontend  | Svelte 5, TypeScript, Tailwind CSS v4, Vite |
| Proxy     | Cloudflare Workers                          |
| Icons     | `@lucide/svelte`                            |
| Tests     | Vitest (unit), Playwright (e2e)             |
| CI        | GitHub Actions                              |

## Development

```sh
make install    # Install all dependencies (frontend + worker)
make dev        # Start Vite dev server
make check      # Full CI gate: lint + typecheck + test + build
make format     # Auto-format with Prettier
make test       # Run unit + e2e tests
```

## License

[Apache-2.0](LICENSE)
