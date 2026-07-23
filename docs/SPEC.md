# shopify-viewer Functional Specification

This document defines the exact behavior of every user-facing feature. It is the contract between design intent and implementation. If the spec doesn't say how something works, the developer must ask -- not guess.

References: API.md for upstream data schema, DESIGN.md for architecture, CONSTITUTION.md for coding standards.

## Application State Machine

The app has one global state machine governing the fetch lifecycle:

```
                  ┌──────────┐
                  │   IDLE   │◀──────────────────────────────────┐
                  └────┬─────┘                                   │
                       │ user submits store URL                  │
                       ▼                                         │
              ┌────────────────┐                                 │
              │ VALIDATING_URL │                                 │
              └───┬────────┬───┘                                 │
        invalid   │        │  valid                              │
                  ▼        ▼                                     │
          ┌───────────┐  ┌──────────────┐                        │
          │URL_ERROR  │  │FETCHING_META │                        │
          └───────────┘  └──┬───────┬───┘                        │
                    failed  │       │  success                   │
                            ▼       ▼                            │
                    ┌──────────┐  ┌───────────────────┐          │
                    │META_ERROR│  │FETCHING_PRODUCTS  │          │
                    └──────────┘  └──┬──────────┬─────┘          │
                          failed    │          │  all pages done │
                                    ▼          ▼                 │
                            ┌────────────┐  ┌────────┐           │
                            │FETCH_ERROR │  │LOADED  │           │
                            └────────────┘  └───┬────┘           │
                                                │ user submits   │
                                                │ new store URL  │
                                                └────────────────┘
```

### State Definitions

| State               | UI Behavior                                                                                                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IDLE`              | Input enabled, no results shown, recent stores dropdown available. Views hidden.                                                                                                                          |
| `VALIDATING_URL`    | Instant (synchronous). Validates URL format client-side. No visible loading state.                                                                                                                        |
| `URL_ERROR`         | Input enabled with inline error message below input. Error clears on next keystroke.                                                                                                                      |
| `FETCHING_META`     | Input disabled. Spinner on submit button. Status text: "Connecting to {domain}..."                                                                                                                        |
| `META_ERROR`        | Input enabled. Error message: "This doesn't appear to be a Shopify store" or "Store is unreachable." Retry button.                                                                                        |
| `FETCHING_PRODUCTS` | Input disabled. Progress bar visible with `aria-live`. Status text: "Fetching products... {current} of ~{total}". View tabs visible but disabled.                                                         |
| `FETCH_ERROR`       | Input enabled. Error message with partial results if any pages succeeded. If partial: "Fetched {N} of ~{total} products. Some pages failed." with option to view partial data or retry.                   |
| `LOADED`            | Input enabled (can search another store). Progress bar hidden. View tabs enabled. Active view shown. Store added to recent stores. Price snapshot saved to IndexedDB. Collections fetched (non-blocking). |

### Transitions

| From                | To                  | Trigger                                               | Side Effects                                                                                                             |
| ------------------- | ------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `IDLE`              | `VALIDATING_URL`    | User clicks "Fetch" or presses Enter                  | None                                                                                                                     |
| `VALIDATING_URL`    | `URL_ERROR`         | URL fails validation                                  | Show error message                                                                                                       |
| `VALIDATING_URL`    | `FETCHING_META`     | URL passes validation                                 | Disable input, show spinner                                                                                              |
| `FETCHING_META`     | `META_ERROR`        | Proxy returns error, timeout, or non-Shopify response | Re-enable input, show error                                                                                              |
| `FETCHING_META`     | `FETCHING_PRODUCTS` | Meta response received                                | Store meta in state, show progress bar, begin pagination                                                                 |
| `FETCHING_PRODUCTS` | `FETCH_ERROR`       | All retry attempts exhausted on a page                | Re-enable input, show error with partial data option                                                                     |
| `FETCHING_PRODUCTS` | `LOADED`            | Empty products array received (last page)             | Hide progress bar, enable view tabs, compute derived data, save to recent stores, save price snapshot, fetch collections |
| Any error state     | `VALIDATING_URL`    | User clicks "Fetch" or presses Enter                  | Clear previous error                                                                                                     |
| `LOADED`            | `VALIDATING_URL`    | User submits new store URL                            | Clear previous products, reset views                                                                                     |

## URL Input

### Component: StoreInput

**Input field:**

- Single text input with placeholder: `"Enter a Shopify store URL (e.g., lttstore.com)"`
- Max length: 253 characters (maximum domain length per RFC 1035)
- Submit button labeled "Fetch Products"
- Keyboard: Enter key submits
- `aria-label="Store URL"` on the input element

**URL normalization (in order):**

1. Trim whitespace
2. If input contains `/products.json`, strip it and everything after
3. If input starts with `http://` or `https://`, parse as URL and extract hostname
4. If input contains `/`, take everything before the first `/`
5. Preserve `www.` if the user entered it -- do NOT strip it during normalization
6. Result must match domain regex: `^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$`
7. If validation fails, transition to `URL_ERROR`

**www fallback (handled by proxy):** If the proxy request to the normalized domain fails, the proxy retries with `www.` prepended (if absent) or stripped (if present). This is transparent to the frontend -- the frontend always sends the domain as-entered after normalization.

**Accepted input examples:**

| Input                                    | Normalized Domain          |
| ---------------------------------------- | -------------------------- |
| `lttstore.com`                           | `lttstore.com`             |
| `www.lttstore.com`                       | `lttstore.com`             |
| `https://www.lttstore.com`               | `lttstore.com`             |
| `https://www.lttstore.com/products.json` | `lttstore.com`             |
| `lttstore.myshopify.com`                 | `lttstore.myshopify.com`   |
| `LTTSTORE.COM`                           | `lttstore.com` (lowercase) |

**Rejected input examples:**

| Input                | Error Message                               |
| -------------------- | ------------------------------------------- |
| (empty)              | "Enter a store URL"                         |
| `not a url`          | "Enter a valid domain (e.g., lttstore.com)" |
| `192.168.1.1`        | "Enter a valid domain (e.g., lttstore.com)" |
| `localhost`          | "Enter a valid domain (e.g., lttstore.com)" |
| `file:///etc/passwd` | "Enter a valid domain (e.g., lttstore.com)" |

### Recent Stores Dropdown

- Appears when input is focused AND recent stores exist in localStorage
- Shows up to 10 most recent stores (sorted by `lastVisited` descending)
- Each entry displays: store name (from meta), domain, relative time ("2 hours ago")
- Clicking an entry fills the input and immediately triggers fetch
- "Clear history" link at bottom of dropdown
- Dropdown closes on: blur (with delay for click), Escape key, successful fetch
- localStorage key: `shopify-viewer-recent`
- Max entries stored: 20 (oldest evicted on overflow)
- If localStorage is unavailable (blocked, private browsing): silently skip, no error

### URL Parameters

On page load, read from URL search params:

| Param                               | Behavior                                               |
| ----------------------------------- | ------------------------------------------------------ |
| `?store=lttstore.com`               | Pre-fill input and auto-fetch immediately              |
| `?view=cards`                       | Set active view tab (only applied after products load) |
| `?store=lttstore.com&view=analysis` | Both: auto-fetch and set view                          |

On state change, update URL params (using `history.replaceState`, not `pushState` -- avoid polluting browser history):

| State Change                       | URL Update                |
| ---------------------------------- | ------------------------- |
| Products loaded for `lttstore.com` | Set `?store=lttstore.com` |
| View tab switched to `cards`       | Set/update `&view=cards`  |
| New store fetched                  | Replace `store` param     |

Valid `view` param values: `summary`, `products`, `cards`, `categories`, `analysis`, `history`, `compare`, `export`. Invalid values default to `summary`.

## Fetch Behavior

### Meta Fetch

- Endpoint: `GET {proxy}/api/meta?store={domain}`
- Proxy: `https://shopify-viewer-proxy.strongwind.workers.dev`
- Timeout: 10 seconds
- On success: store `name`, `currency`, `published_products_count` in state. The `money_format` field is present in the response but is not parsed -- price formatting uses `Intl.NumberFormat` with the `currency` code instead.
- On failure: transition to `META_ERROR`. Do not attempt product fetch.
- On non-JSON response (password-protected store): proxy returns `NOT_SHOPIFY` error

### Product Fetch

- Endpoint: `GET {proxy}/api/products?store={domain}&limit=250&page={n}`
- Timeout: 30 seconds per page
- Retry: 1 retry per failed page (2 attempts total), with 2-second delay between attempts
- Pacing: minimum 500ms between requests
- Progress callback fires after each successful page
- Stop condition: empty `products` array received OR fewer than 250 products in a page
- On partial failure (some pages succeed, some fail after retries): transition to `FETCH_ERROR` with partial data available
- On complete success: transition to `LOADED`
- Products accumulate incrementally -- the reactive store updates after each page, so derived values recompute progressively

### Post-Fetch Actions

After products load successfully:

1. Save price snapshot to IndexedDB via `saveSnapshot(domain, products)` (fire-and-forget)
2. Fetch collections from `/api/collections?store={domain}` (fire-and-forget, displayed in Category Breakdown view)
3. Add store to recent stores in localStorage
4. Update URL params

### Cancellation

- If the user submits a new store URL while a fetch is in progress, cancel the current fetch (AbortController)
- Canceled fetches do not trigger error states -- the new fetch takes over

## Search and Filtering

### Component: SearchFilter

A combined search and filter bar that applies to the Summary, Products, and Cards views. Hidden on the other five views.

**Text search input:**

- Placeholder: "Search products..."
- `aria-label="Search products"`
- Filters products by matching (case-insensitive) against: title, product_type, vendor, and tags
- Clear button (X icon) appears when search is non-empty, with `aria-label="Clear search"`

**Category dropdown:**

- `aria-label="Filter by category"`
- Options: "All Categories" (default), then all unique `product_type` values sorted alphabetically
- Selecting a category filters to products matching that product_type
- "Uncategorized" maps to products with empty `product_type`

**Stock filter dropdown:**

- `aria-label="Filter by stock status"`
- Options: "All Stock" (default), "In Stock", "Out of Stock"
- Filters based on whether any variant of the product is available

**Filter state:**

- Managed as reactive `$state` variables in `App.svelte`: `searchQuery`, `selectedCategory`, `stockFilter`
- Filtered data arrays are `$derived` from the unfiltered data
- Filters are combinable (AND logic across all three)
- Filter count shown in header: "142 products (47 shown)"
- Filters reset when a new store is fetched

## View: Product Summary

**Purpose:** One row per product with the most important fields. The "at-a-glance" view.

### Columns

| #   | Header   | Data Source                                    | Type          | Default Width | Sortable |
| --- | -------- | ---------------------------------------------- | ------------- | ------------- | -------- |
| 1   | Category | `product.product_type`                         | string        | auto          | yes      |
| 2   | Product  | `product.title`                                | string (link) | auto          | yes      |
| 3   | Price    | lowest `variant.price` across all variants     | currency      | 100px         | yes      |
| 4   | In Stock | `true` if ANY variant has `available === true` | badge         | 90px          | yes      |
| 5   | URL      | `https://{domain}/products/{product.handle}`   | link          | auto          | yes      |

### SortableTable

Both Product Summary and Product List use the generic `SortableTable` component.

**Props:**

- `columns`: array of column definitions (key, label, sortable, align, sortValue)
- `data`: array of row objects
- `cell`: Svelte 5 snippet for rendering each cell (receives `{ row, column }`)
- `defaultSortKey`, `defaultSortDir`: initial sort state
- `rowClass`: function returning CSS classes for a row (used for out-of-stock highlighting)
- `pageSize`: rows per page (default: 100)

**Sort behavior:**

- Default sort: by `defaultSortKey` in `defaultSortDir` direction
- Click a column header to sort by that column ascending
- Click the same header again to reverse to descending
- Click a third time to return to default sort
- Sort indicator: ChevronUp for ascending, ChevronDown for descending (from `@lucide/svelte`)
- `aria-sort` attribute on sorted column header

**Pagination:**

- Client-side pagination at 100 rows per page
- Navigation bar below the table: first, prev, next, last buttons
- Row range display: "1--100 of 342 rows"
- Page display: "Page 1 of 4"
- All navigation buttons have `aria-label` attributes
- Changing sort resets to page 1

### Data Transformation: Product -> ProductSummary

```typescript
interface ProductSummary {
  id: number;
  category: string; // product.product_type || "Uncategorized"
  title: string; // product.title
  price: number; // Math.min(...product.variants.map(v => parseFloat(v.price)))
  inStock: boolean; // product.variants.some(v => v.available)
  url: string; // `https://${domain}/products/${product.handle}`
  handle: string; // product.handle
}
```

### Row Styling

- Out-of-stock rows: `bg-red-50 dark:bg-red-950/30` background
- In-stock badge: green background, white text, "YES"
- Out-of-stock badge: red background, white text, "NO"

### Empty State

When 0 products loaded: "This store has no published products." centered in the table area.

## View: Product List

**Purpose:** One row per variant. The detailed spreadsheet-replacement view.

### Columns

| #   | Header         | Data Source                 | Type     | Default Width | Sortable |
| --- | -------------- | --------------------------- | -------- | ------------- | -------- |
| 1   | Category       | `product.product_type`      | string   | auto          | yes      |
| 2   | Product        | `product.title`             | string   | auto          | yes      |
| 3   | Option         | `variant.title`             | string   | auto          | yes      |
| 4   | Price          | `variant.price`             | currency | 100px         | yes      |
| 5   | Original Price | `variant.compare_at_price`  | currency | 120px         | yes      |
| 6   | In Stock       | `variant.available`         | badge    | 90px          | yes      |
| 7   | URL            | constructed per-variant URL | link     | auto          | yes      |
| 8   | Weight (g)     | `variant.grams`             | integer  | 100px         | yes      |
| 9   | Created        | `variant.created_at`        | date     | 120px         | yes      |

### Column-Specific Behavior

**Option column:**

- If `variant.title === "Default Title"`, display empty cell (not the text "Default Title")
- This indicates a single-variant product with no meaningful options

**Price column:**

- Format using `Intl.NumberFormat` with the store's `currency` code from meta.json (e.g., `new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" })`)
- If `currency` is unavailable, fall back to `$X.XX` (USD format)
- Right-aligned

**Original Price column:**

- Display only when `compare_at_price` is not null AND `compare_at_price !== price`
- When displayed, show with strikethrough styling: `line-through text-gray-400`
- When `compare_at_price` is null or equals price: empty cell

**URL column:**

- Format: `https://{domain}/products/{product.handle}?variant={variant.id}`
- Display as truncated link text: `{product.handle}` (not full URL)
- Clicking opens in new tab (`target="_blank" rel="noopener"`)

**Weight column:**

- Display as integer with "g" suffix: `"450 g"`
- If `grams === 0`: display dash

**Created column:**

- Format: `YYYY-MM-DD` (ISO date only, no time)
- Parse from ISO 8601 string, display in user's local timezone

### Sorting

- Default sort: Category ascending, then Product ascending
- Same three-click cycle as Product Summary
- When sorting by Price or Original Price: null/empty values sort to bottom regardless of direction

### Pagination

Same client-side pagination as Product Summary: 100 rows per page via SortableTable.

### Data Transformation: Product + Variant -> ProductListRow

```typescript
interface ProductListRow {
  productId: number;
  variantId: number;
  category: string; // product.product_type || "Uncategorized"
  title: string; // product.title
  option: string; // variant.title === "Default Title" ? "" : variant.title
  price: number; // parseFloat(variant.price)
  originalPrice: number | null; // variant.compare_at_price ? parseFloat(variant.compare_at_price) : null
  inStock: boolean; // variant.available
  url: string; // `https://${domain}/products/${product.handle}?variant=${variant.id}`
  weightGrams: number; // variant.grams
  createdAt: string; // variant.created_at (ISO 8601)
}
```

### Row Styling

Same as Product Summary: out-of-stock rows highlighted, badges for stock status.

## View: Card Grid

**Purpose:** Visual product browsing with images. Storefront-style layout.

### Card Layout

Each card contains (top to bottom):

1. **Image** (top, full card width)
   - Source: first element of `product.images[0].src`, or `variant.featured_image.src` if no product images
   - Shopify CDN thumbnail: append `_400x400` before file extension for optimized size
   - Aspect ratio: 1:1 (square crop, `object-cover`)
   - Fallback: gray placeholder with package icon when no images exist
   - `loading="lazy"` attribute
   - `alt` text: `product.images[0].alt || product.title`
   - Clickable: opens ImageGallery lightbox if product has images

2. **Photo count badge** (overlaid on image, bottom-right corner)
   - Shows "{N} photos" when product has more than 1 image
   - Semi-transparent background: `bg-black/60 text-white text-xs px-2 py-1 rounded`
   - Hidden for single-image products

3. **Category badge** (overlaid on image, top-left corner)
   - Shows `product.product_type`
   - Hidden if `product_type` is empty
   - Semi-transparent background: `bg-black/60 text-white text-xs px-2 py-1 rounded`

4. **Product title** (below image)
   - `font-semibold text-base`
   - Truncate with ellipsis after 2 lines: `line-clamp-2`

5. **Price display** (below title)
   - If all variants same price: `"$34.99"`
   - If variants differ: `"$19.99 -- $49.99"` (en dash, not hyphen)
   - `font-bold text-lg`

6. **Stock badge and variant count** (bottom, side by side)
   - In stock (all variants available): green badge "In Stock"
   - Out of stock (no variants available): red badge "Out of Stock"
   - Partial (some variants available, some not): yellow badge "Limited Stock"
   - Variant count: "{N} variants" if N > 1, hidden if N === 1
   - `text-sm text-gray-500`

### Card Interaction

- **Click card body**: opens `https://{domain}/products/{product.handle}` in new tab
- **Click image area**: opens ImageGallery lightbox (prevents card link navigation). Has `role="button"`, `tabindex="0"`, and `aria-label="View images for {product.title}"`
- **Hover**: subtle shadow increase (`shadow-md` -> `shadow-lg`), cursor pointer

### Image Gallery (Lightbox)

Component: `ImageGallery.svelte`

Triggered by clicking a product image in the Card Grid view. Displays a fullscreen modal with all product images.

**Layout:**

- Fixed overlay: `fixed inset-0 z-50 bg-black/80`
- `role="dialog"`, `aria-modal="true"`, `aria-label="Product image gallery for {product.title}"`
- Close button (X icon) at top-right, `aria-label="Close gallery"`
- Current image centered, `max-h-[80vh] max-w-full object-contain`
- Prev/next buttons on left/right edges (disabled at boundaries)
- Thumbnail strip below image for direct selection (highlighted border on active)
- Image counter: "{currentIndex + 1} / {total} -- {product.title}"

**Keyboard controls:**

- `Escape`: close gallery
- `ArrowLeft`: previous image
- `ArrowRight`: next image

**Click behavior:**

- Click backdrop (outside image): close gallery
- Click thumbnail: jump to that image

### Grid Layout

| Breakpoint         | Columns | Gap  |
| ------------------ | ------- | ---- |
| < 640px (mobile)   | 1       | 16px |
| 640px--767px (sm)  | 2       | 16px |
| 768px--1023px (md) | 3       | 20px |
| >= 1024px (lg)     | 4       | 24px |

### Image URL Transformation

Shopify CDN URLs follow the pattern:

```
https://cdn.shopify.com/s/files/1/XXXX/XXXX/files/image-name.jpg?v=NNNNN
```

To get a resized thumbnail, insert the size before the extension:

```
https://cdn.shopify.com/s/files/1/XXXX/XXXX/files/image-name_400x400.jpg?v=NNNNN
```

Implementation: split URL at last `.` before `?`, insert `_400x400`, rejoin.

If the URL doesn't match the expected CDN pattern, use the original URL unmodified.

### Sorting

Cards are sorted by Category ascending, then Product title ascending (matching the table views). No user-selectable sort on the card view.

## View: Category Breakdown

**Purpose:** Products grouped by category with aggregate statistics per group, plus a collections table.

### Category Group

Each category section contains:

1. **Header bar** (clickable to expand/collapse)
   - Category name (bold, large): `product_type` or "Uncategorized"
   - Product count: "{N} products"
   - Variant count: "{N} variants"
   - In-stock rate: "{X}% in stock" -- percentage of products with at least one available variant
   - Price range: "$X.XX -- $Y.YY" (min to max across all variants in category)
   - Expand/collapse chevron icon (right-aligned): ChevronRight collapsed, ChevronDown expanded (from `@lucide/svelte`)

2. **Product list** (visible when expanded)
   - Simple list (not full table) of products in this category
   - Each row: product title (link), lowest price, stock badge
   - Sorted by product title ascending within each category

### Collections Table

Below the category groups, if collections have been fetched from `/collections.json`:

- Section header: "Collections ({count})"
- Table columns: Collection (title), Products (count), Last Updated (date, truncated to YYYY-MM-DD)
- Rendered as a standard `<table>` with `<th scope="col">` headers

### Data Transformation: Products -> CategoryGroup[]

```typescript
interface CategoryGroup {
  name: string; // product_type or "Uncategorized"
  products: ProductSummary[]; // products in this category (reuse ProductSummary type)
  productCount: number; // products.length
  variantCount: number; // sum of all variants across products
  inStockCount: number; // products where any variant is available
  inStockRate: number; // (inStockCount / productCount) * 100, rounded to 1 decimal
  priceMin: number; // min price across all variants in category
  priceMax: number; // max price across all variants in category
}
```

### Layout

- Categories sorted by product count descending (largest first)
- All categories start collapsed
- Clicking a header toggles only that category (independent expand/collapse via `SvelteSet`)
- "Expand All" / "Collapse All" buttons above the category list
- In-stock rate color coding in the header:
  - > = 80%: green text
  - 40%--79%: yellow/amber text
  - < 40%: red text

### Empty Category

If a store has no products with `product_type` set, show a single "Uncategorized" group containing all products.

## View: Price Analysis

**Purpose:** Statistical summary and visual analysis of pricing across the store.

### Section 1: Summary Statistics

Top-level stat cards in a horizontal row (wrap on mobile):

| Stat           | Calculation                          | Format               |
| -------------- | ------------------------------------ | -------------------- |
| Total Products | `products.length`                    | integer              |
| Total Variants | sum of all `product.variants.length` | integer              |
| Average Price  | mean of all variant prices           | currency, 2 decimals |
| Median Price   | median of all variant prices         | currency, 2 decimals |
| Lowest Price   | min of all variant prices            | currency, 2 decimals |
| Highest Price  | max of all variant prices            | currency, 2 decimals |

Each stat card: large number, small label below, contained in a bordered card.

### Section 2: Sale Analysis

| Stat             | Calculation                                                                                             | Format                           |
| ---------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Items on Sale    | count of variants where `compare_at_price !== null && parseFloat(compare_at_price) > parseFloat(price)` | "{N} of {total} variants ({X}%)" |
| Average Discount | mean of `((compare_at_price - price) / compare_at_price * 100)` for sale items                          | "{X}%"                           |
| Biggest Discount | max of the above                                                                                        | "{X}% off -- {product title}"    |
| Total Savings    | sum of `(compare_at_price - price)` across all sale variants                                            | currency                         |

If no items are on sale: display "No items are currently on sale." and hide the detail stats.

### Section 3: Price by Category

Table with one row per category:

| Column    | Data                               | Sortable |
| --------- | ---------------------------------- | -------- |
| Category  | `product_type` or "Uncategorized"  | yes      |
| Products  | count                              | yes      |
| Avg Price | mean of variant prices in category | yes      |
| Min Price | min variant price in category      | yes      |
| Max Price | max variant price in category      | yes      |
| Spread    | max - min                          | yes      |

Default sort: Avg Price descending (most expensive categories first).

### Section 4: Price Distribution

Histogram rendered as an SVG bar chart:

- X-axis: price ranges (buckets)
- Y-axis: number of variants in each bucket
- Bucket calculation:
  - If price range (max - min) <= $100: $10 buckets
  - If price range <= $500: $50 buckets
  - If price range <= $2000: $100 buckets
  - If price range > $2000: $500 buckets
  - Maximum 20 buckets -- widen bucket size if needed
- Bar labels: bucket range on x-axis, count on y-axis or on top of bar
- Colors: bars use the primary theme color (blue in light mode, lighter blue in dark mode)
- Responsive: SVG viewport scales to container width
- No external charting library -- hand-built SVG

### Section 5: Top/Bottom Products

Two side-by-side lists (stacked on mobile):

**Most Expensive (Top 5):**

- Ranked list of products by highest variant price
- Each entry: rank number, product title, price, category

**Least Expensive (Top 5):**

- Same format, ranked by lowest variant price
- Exclude products with price $0.00 (gift cards, free items)

### Data Transformation: Products -> PriceAnalysis

```typescript
interface PriceAnalysis {
  totalProducts: number;
  totalVariants: number;
  averagePrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  saleItems: SaleAnalysis;
  categoryPricing: CategoryPricing[];
  distribution: PriceBucket[];
  mostExpensive: RankedProduct[];
  leastExpensive: RankedProduct[];
}

interface SaleAnalysis {
  count: number;
  totalVariants: number;
  percentage: number;
  averageDiscount: number;
  biggestDiscount: { percentage: number; productTitle: string };
  totalSavings: number;
}

interface CategoryPricing {
  name: string;
  productCount: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  spread: number;
}

interface PriceBucket {
  min: number;
  max: number;
  count: number;
  label: string; // "$0-$10", "$10-$20", etc.
}

interface RankedProduct {
  rank: number;
  title: string;
  price: number;
  category: string;
  handle: string;
}
```

## View: Price History

**Purpose:** Track price and stock changes across visits to the same store.

### Storage

Price snapshots are stored in IndexedDB (database: `shopify-viewer-history`, object store: `snapshots`):

- Composite key: `[domain, timestamp]`
- Index on `domain` for lookups
- Each snapshot contains a `ProductPriceEntry[]` array with: `id`, `title`, `handle`, `minPrice` (lowest variant price), `available` (any variant available)
- A new snapshot is saved automatically on every successful product fetch

### Data Types

```typescript
interface PriceSnapshot {
  domain: string;
  timestamp: string; // ISO 8601
  products: ProductPriceEntry[];
}

interface ProductPriceEntry {
  id: number;
  title: string;
  handle: string;
  minPrice: number;
  available: boolean;
}

interface PriceChange {
  id: number;
  title: string;
  handle: string;
  oldPrice: number;
  newPrice: number;
  diff: number; // newPrice - oldPrice
  wasAvailable: boolean;
  nowAvailable: boolean;
}
```

### UI

**Empty state (fewer than 2 snapshots):**

- Icon + message: "No price history yet. Fetch this store's products to start tracking." (0 snapshots) or "Only one snapshot recorded. Fetch again later to see changes." (1 snapshot)

**Comparison view (2+ snapshots):**

- Dropdown: "Compare current to:" with all previous snapshots listed by timestamp and product count
- Default: compare latest (index 0) against second-latest (index 1)
- If no changes detected: "No price or stock changes detected."
- If changes exist: "{N} change(s) detected" header, followed by a list of change cards

**Change card:**

- Product title (bold)
- Price line: old price -> new price, with diff amount
  - Price decrease: green text with TrendingDown icon
  - Price increase: red text with TrendingUp icon
  - No price change: gray Minus icon
- Stock status badge (right side):
  - Went out of stock: red "Now OOS" badge
  - Back in stock: green "Back in Stock" badge
  - No stock change: no badge shown

### Computation

`computeChanges(previous, current)`:

1. Build a Map of previous products by ID
2. For each current product, look up the matching previous product by ID
3. If the product existed before AND either minPrice or available changed, include it in the changes list
4. Sort changes by absolute price diff descending (largest changes first)
5. Products that exist in current but not in previous (new products) are not shown
6. Products that existed in previous but not in current (removed products) are not shown

## View: Store Comparison

**Purpose:** Compare product catalogs of two Shopify stores side by side.

### UI

**Input section:**

- Text input with placeholder: "Enter another Shopify store URL"
- `aria-label="Comparison store URL"`
- "Compare" button with Search icon (shows Loader2 spinner while fetching)
- Clear button (X icon) appears after comparison is loaded, `aria-label="Clear comparison"`
- Error message below input if fetch fails

**Comparison table (visible after second store loads):**

- Three columns: Metric, Primary Store Name, Comparison Store Name
- Primary store name in blue, comparison store name in purple
- Metrics:

| Metric         | Calculation                                                 |
| -------------- | ----------------------------------------------------------- |
| Total Products | product count per store                                     |
| Total Variants | sum of variants per store                                   |
| Avg Price      | mean of all variant prices (rounded to 2 decimals)          |
| In Stock       | count and percentage of products with any available variant |
| Categories     | count of unique product_type values                         |
| Price Range    | min -- max across all variant prices                        |

**Per-store summary cards:**

- Two cards side by side (stacked on mobile), color-coded (blue for primary, purple for comparison)
- Each card shows: store name, product count, variant count, in-stock badge count, out-of-stock badge count

### Fetch Behavior

The comparison store fetch is independent of the main store:

- Uses the same `validateStoreInput`, `fetchMeta`, and `fetchAllProducts` functions
- No progress bar (comparison happens in background)
- No AbortController (comparison fetch is not cancellable via main UI)
- Handles different currencies between stores (each store's prices formatted with its own currency code)

### Data Types

```typescript
interface StoreStat {
  label: string;
  primary: string;
  compare: string;
}
```

## View: Export

**Purpose:** Download fetched data in CSV or JSON format for offline analysis.

### Export Options

Four download buttons in a 2x2 grid:

| Button Label            | File Name Pattern                             | Format                                     |
| ----------------------- | --------------------------------------------- | ------------------------------------------ |
| "Product List (CSV)"    | `{domain}-product-list-{YYYY-MM-DD}.csv`      | CSV with all variant rows                  |
| "Product Summary (CSV)" | `{domain}-product-summary-{YYYY-MM-DD}.csv`   | CSV with one row per product               |
| "Raw Data (JSON)"       | `{domain}-products-raw-{YYYY-MM-DD}.json`     | Original API response (all products array) |
| "Summary Data (JSON)"   | `{domain}-products-summary-{YYYY-MM-DD}.json` | Transformed ProductSummary array           |

### CSV Format

- RFC 4180 compliant
- UTF-8 encoding with BOM prefix for Excel compatibility
- Header row as first line
- Fields containing commas, quotes, or newlines wrapped in double quotes
- Double quotes escaped as `""`
- Line endings: `\r\n` (CRLF per RFC 4180)

**Product List CSV columns (same order as the view):**

```
Category,Product,Option,Price,Original Price,In Stock,URL,Weight (g),Created
```

**Product Summary CSV columns:**

```
Category,Product,Price,In Stock,URL
```

### JSON Format

- Pretty-printed with 2-space indentation
- Raw data: `{ "store": "{domain}", "fetchedAt": "ISO-8601", "products": [...] }`
- Summary data: `{ "store": "{domain}", "fetchedAt": "ISO-8601", "products": [...summaries] }`

### Download Mechanism

1. Serialize data to string (CSV or JSON)
2. Create `Blob` with appropriate MIME type (`text/csv; charset=utf-8` or `application/json`)
3. Create object URL via `URL.createObjectURL(blob)`
4. Create hidden `<a>` element with `href` and `download` attributes
5. Programmatically click the anchor
6. Revoke object URL via `URL.revokeObjectURL()`

### Export State

- Buttons disabled when no products are loaded
- Each button shows a brief "Downloaded!" confirmation (1.5 seconds) after click
- No server-side processing -- all export happens client-side

## Theme Toggle

### Behavior

1. On first visit: follow OS preference via `prefers-color-scheme` media query
2. User clicks toggle: switch to opposite theme, persist choice in `localStorage` key `shopify-viewer-theme`
3. On subsequent visits: apply persisted choice, ignore OS preference
4. If `localStorage` is unavailable: toggle works for current session only, no persistence

### Implementation

- HTML `<html>` element gets `data-theme="light"` or `data-theme="dark"` attribute
- Tailwind `darkMode: "selector"` with selector `[data-theme="dark"]`
- Toggle button: sun icon in dark mode, moon icon in light mode (from `@lucide/svelte`)
- Button `aria-label`: "Switch to light theme" or "Switch to dark theme"
- Button `aria-pressed`: `"true"` when dark mode active

### Colors

| Element                  | Light                  | Dark                               |
| ------------------------ | ---------------------- | ---------------------------------- |
| Background               | `#ffffff`              | `#0f172a` (slate-900)              |
| Text                     | `#1e293b` (slate-800)  | `#e2e8f0` (slate-200)              |
| Primary (links, buttons) | `#2563eb` (blue-600)   | `#60a5fa` (blue-400)               |
| Card background          | `#ffffff`              | `#1e293b` (slate-800)              |
| Card border              | `#e2e8f0` (slate-200)  | `#334155` (slate-700)              |
| Table header bg          | `#f8fafc` (slate-50)   | `#1e293b` (slate-800)              |
| Table row hover          | `#f1f5f9` (slate-100)  | `#334155` (slate-700)              |
| Out-of-stock row         | `#fef2f2` (red-50)     | `rgba(127,29,29,0.3)` (red-900/30) |
| In-stock badge bg        | `#22c55e` (green-500)  | `#22c55e` (green-500)              |
| Out-of-stock badge bg    | `#ef4444` (red-500)    | `#ef4444` (red-500)                |
| Limited stock badge bg   | `#eab308` (yellow-500) | `#eab308` (yellow-500)             |

## Header

### Layout (left to right)

1. **App title:** "Shopify Viewer" -- `text-xl font-bold`, links to app root (clears state)
2. **Spacer** (flex-grow)
3. **Theme toggle button:** icon only, 40x40px tap target
4. **GitHub link:** icon only (GitHub mark SVG), opens repo in new tab, `aria-label="View source on GitHub"`

### Responsive

- All elements visible at all breakpoints
- On mobile (< 640px): title font size reduces to `text-lg`

## Footer

### Content

- Left: "Last fetched: {relative time}" (e.g., "2 minutes ago") -- hidden when no data loaded
- Right: "Source" link to GitHub repo

### Styling

- `text-sm text-gray-500 dark:text-gray-400`
- Border top: `border-t border-gray-200 dark:border-gray-700`
- Padding: `py-4`

## Error Messages

All error messages appear inline below the store URL input. Error styling: `text-red-600 dark:text-red-400 text-sm mt-2`.

| Error Code        | Message                                                                   | Recovery                                    |
| ----------------- | ------------------------------------------------------------------------- | ------------------------------------------- |
| `INVALID_URL`     | "Enter a valid Shopify store URL (e.g., lttstore.com)"                    | User corrects input                         |
| `STORE_NOT_FOUND` | "This doesn't appear to be a Shopify store. Check the URL and try again." | User corrects input                         |
| `STORE_PASSWORD`  | "This store is password-protected and cannot be accessed publicly."       | None (informational)                        |
| `PROXY_ERROR`     | "Unable to reach the proxy server. Please try again in a moment."         | "Retry" button                              |
| `RATE_LIMITED`    | "Too many requests. Please wait a moment and try again."                  | "Retry" button (disabled for 5 seconds)     |
| `FETCH_TIMEOUT`   | "The store took too long to respond. It may be temporarily unavailable."  | "Retry" button                              |
| `PARTIAL_FETCH`   | "Fetched {N} of ~{total} products. Some pages could not be loaded."       | "View partial data" button + "Retry" button |
| `EMPTY_STORE`     | "This store has no published products."                                   | None (informational)                        |
| `UNKNOWN_ERROR`   | "Something went wrong. Please try again."                                 | "Retry" button                              |

## Keyboard Navigation

| Key                 | Context               | Action                                            |
| ------------------- | --------------------- | ------------------------------------------------- |
| Enter               | Input focused         | Submit store URL                                  |
| Escape              | Dropdown open         | Close recent stores dropdown                      |
| Escape              | Image gallery open    | Close gallery                                     |
| ArrowLeft           | Image gallery open    | Previous image                                    |
| ArrowRight          | Image gallery open    | Next image                                        |
| ArrowDown / ArrowUp | Dropdown open         | Navigate recent stores                            |
| Enter               | Dropdown item focused | Select store and fetch                            |
| Tab                 | Any                   | Standard focus order through interactive elements |
| Space               | Toggle/button focused | Activate                                          |

## Accessibility

- All interactive elements focusable and operable via keyboard
- Tab container: `role="tablist"` with `aria-label="View tabs"`
- Tab buttons: `role="tab"` with `aria-selected` attribute
- Active view container: `role="tabpanel"` with `aria-label="{view} view"`
- All inputs have `aria-label`: "Store URL", "Search products", "Filter by category", "Filter by stock status", "Comparison store URL"
- Progress bar: `aria-live` for screen reader announcements of fetch progress
- Tables: `<th scope="col">` for headers, `aria-sort` for sorted columns
- SortableTable pagination: `aria-label` on all navigation buttons (First page, Previous page, Next page, Last page)
- Images: `alt` text (product title or alt from API)
- Image gallery: `role="dialog"`, `aria-modal="true"`, `aria-label` on close/prev/next/thumbnail buttons
- Badges use `aria-label` in addition to visual text
- Theme toggle: `aria-pressed` and descriptive `aria-label`
- Color is never the sole indicator of state -- badges have text, out-of-stock rows have text + color
- Focus visible outline on all interactive elements (Tailwind's `focus-visible:ring-2`)
- Minimum tap target size: 44x44px for all buttons and interactive elements

## Responsive Breakpoints

Using Tailwind's default breakpoints:

| Breakpoint       | Width     | Layout Changes                                                                                                                                  |
| ---------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Default (mobile) | < 640px   | Single column. Tables horizontally scrollable with pagination. Cards single column. Stat cards stack vertically. Tab labels hidden (icon-only). |
| `sm`             | >= 640px  | Card grid 2 columns. Stat cards 2 per row. Tab labels visible.                                                                                  |
| `md`             | >= 768px  | Card grid 3 columns. Tables fit without scrolling (most stores). Stat cards 3 per row. Comparison cards side by side.                           |
| `lg`             | >= 1024px | Card grid 4 columns. Full table width. Stat cards in single row. Top/bottom products side by side.                                              |

Tables: wrap in `<div class="overflow-x-auto">` so they scroll horizontally on small screens rather than breaking the page layout.
