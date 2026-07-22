# shopify-viewer

Browse and analyze product data from any Shopify store. Enter a store URL, fetch all products via the public `/products.json` endpoint, and explore the catalog through six interactive views.

**Live:** [strongwind.dev/shopify-viewer](https://strongwind.dev/shopify-viewer/)

## Features

- **Product Summary** — one row per product with lowest price and stock status
- **Product List** — every variant with price, original price, weight, and creation date
- **Card Grid** — visual product cards with images from the Shopify CDN
- **Category Breakdown** — products grouped by type with aggregate statistics
- **Price Analysis** — price distribution, sale detection, and per-category averages
- **Export** — download as CSV or JSON for offline analysis

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
Browser ──▶ Cloudflare Worker (CORS proxy) ──▶ Shopify Store /products.json
```

Shopify's public JSON endpoints don't include CORS headers. The Cloudflare Worker proxies requests server-side and adds the appropriate headers.

| Component | Stack |
|---|---|
| Frontend | Svelte 5, TypeScript, Tailwind CSS, Vite |
| Proxy | Cloudflare Workers |
| Icons | Lucide |
| Tests | Vitest (unit), Playwright (e2e) |
| CI | GitHub Actions |

## Development

```sh
make install    # Install all dependencies
make dev        # Start Vite dev server
make check      # Full CI gate: lint + typecheck + test + build
make format     # Auto-format with Prettier
```

## License

[Apache-2.0](LICENSE)
