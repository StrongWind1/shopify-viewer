<script lang="ts">
  import ProductImage from "../shared/ProductImage.svelte";
  import Badge from "../shared/Badge.svelte";
  import type { ShopifyProduct } from "../../types/shopify-types.js";
  import { parsePrice, formatPrice } from "../../utils/price-utils.js";
  import { productImageSrc } from "../../utils/image-utils.js";

  interface Props {
    products: ShopifyProduct[];
    domain: string;
    currency?: string | undefined;
  }

  const { products, domain, currency = undefined }: Props = $props();

  function priceRange(product: ShopifyProduct): string {
    const prices = product.variants.map((v) => parsePrice(v.price));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return formatPrice(min, currency);
    return `${formatPrice(min, currency)} – ${formatPrice(max, currency)}`;
  }

  function stockStatus(product: ShopifyProduct): "inStock" | "outOfStock" | "limited" {
    const available = product.variants.filter((v) => v.available).length;
    if (available === 0) return "outOfStock";
    if (available < product.variants.length) return "limited";
    return "inStock";
  }

  const stockLabels = { inStock: "In Stock", outOfStock: "Out of Stock", limited: "Limited Stock" } as const;
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
  {#each products as product}
    {@const img = productImageSrc(product.images, product.variants[0]?.featured_image ?? null)}
    {@const status = stockStatus(product)}
    <a
      href={`https://${domain}/products/${product.handle}`}
      target="_blank"
      rel="noopener"
      class="group block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-slate-800"
    >
      <div class="relative aspect-square overflow-hidden">
        <ProductImage src={img?.src ?? null} alt={img?.alt ?? product.title} />
        {#if product.product_type !== ""}
          <span class="absolute top-2 left-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
            {product.product_type}
          </span>
        {/if}
      </div>

      <div class="p-3">
        <h3 class="line-clamp-2 text-base font-semibold text-slate-800 dark:text-slate-200">
          {product.title}
        </h3>
        <p class="mt-1 text-lg font-bold text-slate-800 dark:text-slate-200">
          {priceRange(product)}
        </p>
        <div class="mt-2 flex items-center justify-between">
          <Badge variant={status} label={stockLabels[status]} />
          {#if product.variants.length > 1}
            <span class="text-sm text-gray-500 dark:text-gray-400">
              {product.variants.length} variants
            </span>
          {/if}
        </div>
      </div>
    </a>
  {/each}
</div>
