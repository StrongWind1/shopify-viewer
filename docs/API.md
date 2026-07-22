# Shopify Public Products JSON API Reference

This document specifies the public Shopify storefront JSON endpoints consumed by shopify-viewer. These endpoints are semi-documented, unauthenticated, and available on every Shopify store by default. They are **not** part of the official Shopify Admin REST API or the Storefront GraphQL API.

Shopify declared the REST Admin API legacy in October 2024. These public endpoints have no versioned contract and no guarantee of long-term availability. The proxy and frontend must handle schema changes, missing fields, and endpoint removal gracefully.

## Endpoints

### `GET /products.json` — Paginated Product List

Returns all published products with variants, images, and options.

#### Query Parameters

| Parameter | Type | Default | Max | Description |
|---|---|---|---|---|
| `limit` | integer | 30 | 250 | Products per page. Values above 250 are silently clamped. Values of 0 or negative return the default (30). |
| `page` | integer | 1 | — | 1-indexed page number. Values of 0 or negative return page 1. |

No other query parameters are supported on this endpoint. Parameters like `collection_id`, `ids`, `product_type`, `handle`, `fields`, `since_id`, `vendor`, or `status` are Admin REST API only and require authentication.

#### Response

```json
{
  "products": [Product, ...]
}
```

No pagination metadata is included in the response — no total count, no Link header, no next/prev URLs. The last page is detected by an empty `products` array.

#### Product Object

| Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | integer | no | Unique product ID across Shopify |
| `title` | string | no | Product display name |
| `handle` | string | no | URL-safe slug (used in `/products/<handle>` URLs) |
| `body_html` | string | no | HTML product description |
| `published_at` | string (ISO 8601) | no | Publication timestamp with timezone offset |
| `created_at` | string (ISO 8601) | no | Creation timestamp |
| `updated_at` | string (ISO 8601) | no | Last modification timestamp |
| `vendor` | string | no | Manufacturer or brand name |
| `product_type` | string | no | Category classification (can be empty string) |
| `tags` | array of strings | no | Product tags as individual array elements |
| `variants` | array of Variant | no | Product variants (at least one) |
| `images` | array of Image | no | Product images (can be empty) |
| `options` | array of Option | no | Product options (size, color, etc.) |

#### Variant Object

| Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | integer | no | Unique variant ID |
| `product_id` | integer | no | Parent product ID |
| `title` | string | no | Combined option values (e.g., "Regular / Small") or "Default Title" for single-variant products |
| `price` | string | no | Price as decimal string (e.g., `"34.99"`) — NOT a number |
| `compare_at_price` | string | yes | Original/sale comparison price; `null` if no comparison price set |
| `sku` | string | no | Stock keeping unit (can be empty string) |
| `position` | integer | no | Display order (1-indexed) |
| `option1` | string | yes | First option value |
| `option2` | string | yes | Second option value |
| `option3` | string | yes | Third option value |
| `grams` | integer | no | Weight in grams (can be 0) |
| `requires_shipping` | boolean | no | Whether physical shipping is required |
| `taxable` | boolean | no | Whether tax applies |
| `available` | boolean | no | Whether the variant is in stock |
| `featured_image` | Image | yes | Variant-specific image when assigned; `null` otherwise |
| `created_at` | string (ISO 8601) | no | Creation timestamp |
| `updated_at` | string (ISO 8601) | no | Last modification timestamp |

#### Image Object

| Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | integer | no | Unique image ID |
| `product_id` | integer | no | Parent product ID |
| `position` | integer | no | Display order (1-indexed) |
| `created_at` | string (ISO 8601) | no | Creation timestamp |
| `updated_at` | string (ISO 8601) | no | Last modification timestamp |
| `src` | string (URL) | no | Full CDN URL (`https://cdn.shopify.com/s/files/...`) |
| `width` | integer | no | Image width in pixels |
| `height` | integer | no | Image height in pixels |
| `alt` | string | yes | Alt text; `null` if not set |
| `variant_ids` | array of integers | no | IDs of variants associated with this image (empty if unassigned) |

#### Option Object (List Endpoint — Reduced Fields)

| Field | Type | Description |
|---|---|---|
| `name` | string | Option name (e.g., "Color", "Size") |
| `position` | integer | Display order (1-indexed) |
| `values` | array of strings | Available values (e.g., `["Small", "Medium", "Large"]`) |

The list endpoint option object is missing `id` and `product_id` which are present in the single product endpoint.

### `GET /products/<handle>.json` — Single Product

Returns a single product with expanded fields not available in the list endpoint.

#### Response

```json
{
  "product": Product
}
```

Singular `product` key (not `products`).

#### Additional Fields (Not in List Endpoint)

**Product-level:**

| Field | Type | Description |
|---|---|---|
| `image` | Image | Primary/featured product image |
| `published_scope` | string | Publishing scope (e.g., `"global"`) |
| `template_suffix` | string | Liquid template suffix |

**Variant-level:**

| Field | Type | Nullable | Description |
|---|---|---|---|
| `barcode` | string | yes | Barcode/UPC |
| `fulfillment_service` | string | no | Fulfillment handler (e.g., `"manual"`) |
| `inventory_management` | string | no | Tracking system (e.g., `"shopify"`) |
| `image_id` | integer | yes | Associated image ID |
| `weight` | float | no | Weight value |
| `weight_unit` | string | no | Weight unit (e.g., `"lb"`, `"kg"`) |
| `tax_code` | string | no | Tax classification code |
| `price_currency` | string | no | Currency code (e.g., `"USD"`) |
| `compare_at_price_currency` | string | no | Compare-at price currency |
| `quantity_rule` | object | no | `{min, max, increment}` for quantity restrictions |
| `quantity_price_breaks` | array | no | Volume pricing tiers |

**Option-level:**

| Field | Type | Description |
|---|---|---|
| `id` | integer | Unique option ID |
| `product_id` | integer | Parent product ID |

#### Tags Format Inconsistency

The list endpoint returns `tags` as an **array of strings**. The single product endpoint returns `tags` as a **comma-separated string**. The frontend must handle both formats.

### `GET /meta.json` — Store Metadata

Returns store information useful for display and validation.

```json
{
  "id": 12345678,
  "name": "Store Name",
  "city": "Vancouver",
  "province": "British Columbia",
  "country": "CA",
  "currency": "CAD",
  "domain": "www.example.com",
  "myshopify_domain": "example.myshopify.com",
  "description": "...",
  "ships_to_countries": ["CA", "US", ...],
  "money_format": "${{amount}}",
  "published_collections_count": 15,
  "published_products_count": 342
}
```

The `published_products_count` field allows estimating total pages: `Math.ceil(count / limit)`.

### `GET /collections.json` — Collection List

Returns all published collections.

```json
{
  "collections": [
    {
      "id": 123456,
      "handle": "all",
      "title": "All Products",
      "updated_at": "2025-01-01T00:00:00-05:00",
      "body_html": "...",
      "published_at": "2024-01-01T00:00:00-05:00",
      "sort_order": "best-selling",
      "products_count": 342,
      "image": { ... }
    }
  ]
}
```

### `GET /collections/<handle>/products.json` — Collection Products

Same schema as `/products.json` but scoped to a specific collection by its URL handle (not numeric ID). Supports `limit`, `page`, and additionally `sort_by`:

| `sort_by` Value | Description |
|---|---|
| `price-ascending` | Lowest price first |
| `price-descending` | Highest price first |
| `best-selling` | Best sellers first |
| `created-ascending` | Oldest first |
| `created-descending` | Newest first |

## Pagination Strategy

```
page = 1
products = []
loop:
    response = fetch(/products.json?limit=250&page={page})
    if response.products is empty:
        break
    products.append(response.products)
    page++
return products
```

There is no way to know the total page count upfront from the products endpoint alone. Use `/meta.json` → `published_products_count` to estimate total pages for progress indication: `totalPages = Math.ceil(publishedProductsCount / 250)`.

## Rate Limiting

No explicit rate-limit headers are returned (`X-RateLimit-*` or `Retry-After`). Shopify uses Cloudflare for all stores. Constraints:

- Aggressive request patterns trigger Cloudflare challenges (CAPTCHAs) or `429` responses.
- Some developers report hitting "Exceeded 2 calls per second for api client" errors.
- Response includes `shopify-complexity-score` and `shopify-complexity-score-v2` headers.
- The proxy must implement conservative request pacing (e.g., 1 request per second per store).

## CORS

The public `/products.json` endpoint does **not** include `Access-Control-Allow-Origin` headers. Cross-origin browser requests are blocked. Response headers include:

```
x-permitted-cross-domain-policies: none
x-frame-options: DENY
content-security-policy: block-all-mixed-content; frame-ancestors 'none'
```

This is why the Cloudflare Workers proxy exists — the browser fetches from the proxy (same-origin or CORS-enabled), and the proxy fetches from the Shopify store server-side.

## Fields NOT Available (Admin API Only)

These fields require authenticated Admin API access and will never appear in public endpoint responses:

| Field | Description |
|---|---|
| `admin_graphql_api_id` | GraphQL API node ID |
| `status` | Product status (active/archived/draft) |
| `inventory_quantity` | Stock level per variant |
| `old_inventory_quantity` | Previous stock level |
| `inventory_item_id` | Inventory tracking item ID |
| `inventory_policy` | Backorder behavior |
| `presentment_prices` | Multi-currency pricing |
| `metafields` | Custom metadata |

## Known Quirks

1. **Prices are strings, not numbers.** The `.json` endpoints return prices as decimal strings (`"34.99"`). Parse with `parseFloat()` or `Number()` — never assume numeric type.

2. **Tags format differs by endpoint.** List endpoint: array of strings. Single product endpoint: comma-separated string. Always normalize to array.

3. **"Default Title" variants.** Single-variant products have a variant with `title: "Default Title"`. The frontend should suppress or replace this in display.

4. **Empty `product_type`.** Some products have an empty string for `product_type`. Group these under an "Uncategorized" label.

5. **No inventory counts.** Only `available` (boolean) is exposed. Stock levels require Admin API access.

6. **Some stores block access.** Stores can block the endpoint via Cloudflare rules, custom proxies, or password protection. Handle `403`, `404`, and empty responses.

7. **Image URL transformations.** Shopify CDN URLs support suffix-based resizing (e.g., append `_200x200` before the extension). Use this for thumbnails in the card view to reduce bandwidth.

8. **Product ordering is not guaranteed.** Default order appears to be `published_at` descending but this is undocumented.

9. **Stores behind passwords.** Password-protected stores return HTML login pages instead of JSON. Detect `Content-Type` header mismatches.
