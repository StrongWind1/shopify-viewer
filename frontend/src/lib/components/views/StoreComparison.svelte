<script lang="ts">
  import { Search, Loader2, X } from "@lucide/svelte";
  import Badge from "../shared/Badge.svelte";
  import type { ShopifyProduct, ShopifyMeta } from "../../types/shopify-types.js";
  import {
    validateStoreInput,
    fetchMeta,
    fetchAllProducts,
    ShopifyError,
  } from "../../api/client.js";
  import { parsePrice, formatPrice } from "../../utils/price-utils.js";

  interface Props {
    primaryProducts: ShopifyProduct[];
    primaryMeta: ShopifyMeta | null;
    primaryDomain: string;
  }

  const { primaryProducts, primaryMeta, primaryDomain }: Props = $props();

  let compareUrl = $state("");
  let compareProducts = $state<ShopifyProduct[]>([]);
  let compareMeta = $state<ShopifyMeta | null>(null);
  let compareDomain = $state("");
  let loading = $state(false);
  let error = $state<string | null>(null);

  const hasComparison = $derived(compareProducts.length > 0);

  async function handleCompare() {
    error = null;
    let domain: string;
    try {
      domain = validateStoreInput(compareUrl);
    } catch (err) {
      error = err instanceof ShopifyError ? err.message : "Invalid URL";
      return;
    }

    loading = true;
    compareDomain = domain;

    try {
      compareMeta = await fetchMeta(domain);
      compareProducts = await fetchAllProducts(domain, () => {});
      if (compareProducts.length === 0) {
        error = "This store has no products.";
        compareProducts = [];
      }
    } catch (err) {
      error = err instanceof ShopifyError ? err.message : "Failed to fetch store.";
      compareProducts = [];
    } finally {
      loading = false;
    }
  }

  function clearComparison() {
    compareProducts = [];
    compareMeta = null;
    compareDomain = "";
    compareUrl = "";
  }

  interface StoreStat {
    label: string;
    primary: string;
    compare: string;
  }

  const stats = $derived.by((): StoreStat[] => {
    if (!hasComparison) return [];

    const pPrices = primaryProducts.flatMap((p) => p.variants.map((v) => parsePrice(v.price)));
    const cPrices = compareProducts.flatMap((p) => p.variants.map((v) => parsePrice(v.price)));
    const pAvg = pPrices.length > 0 ? pPrices.reduce((a, b) => a + b, 0) / pPrices.length : 0;
    const cAvg = cPrices.length > 0 ? cPrices.reduce((a, b) => a + b, 0) / cPrices.length : 0;
    const pInStock = primaryProducts.filter((p) => p.variants.some((v) => v.available)).length;
    const cInStock = compareProducts.filter((p) => p.variants.some((v) => v.available)).length;
    const pCats = new Set(primaryProducts.map((p) => p.product_type)).size;
    const cCats = new Set(compareProducts.map((p) => p.product_type)).size;
    const pCurrency = primaryMeta?.currency;
    const cCurrency = compareMeta?.currency;

    return [
      {
        label: "Total Products",
        primary: String(primaryProducts.length),
        compare: String(compareProducts.length),
      },
      {
        label: "Total Variants",
        primary: String(primaryProducts.reduce((a, p) => a + p.variants.length, 0)),
        compare: String(compareProducts.reduce((a, p) => a + p.variants.length, 0)),
      },
      {
        label: "Avg Price",
        primary: formatPrice(Math.round(pAvg * 100) / 100, pCurrency),
        compare: formatPrice(Math.round(cAvg * 100) / 100, cCurrency),
      },
      {
        label: "In Stock",
        primary: `${String(pInStock)} (${String(Math.round((pInStock / Math.max(primaryProducts.length, 1)) * 100))}%)`,
        compare: `${String(cInStock)} (${String(Math.round((cInStock / Math.max(compareProducts.length, 1)) * 100))}%)`,
      },
      { label: "Categories", primary: String(pCats), compare: String(cCats) },
      {
        label: "Price Range",
        primary:
          pPrices.length > 0
            ? `${formatPrice(Math.min(...pPrices), pCurrency)} – ${formatPrice(Math.max(...pPrices), pCurrency)}`
            : "N/A",
        compare:
          cPrices.length > 0
            ? `${formatPrice(Math.min(...cPrices), cCurrency)} – ${formatPrice(Math.max(...cPrices), cCurrency)}`
            : "N/A",
      },
    ];
  });
</script>

<div class="space-y-6">
  <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
    <p class="mb-3 text-sm font-medium text-slate-800 dark:text-slate-200">
      Compare with another store
    </p>
    <form
      class="flex gap-2"
      onsubmit={(e) => {
        e.preventDefault();
        void handleCompare();
      }}
    >
      <input
        type="text"
        bind:value={compareUrl}
        placeholder="Enter another Shopify store URL"
        aria-label="Comparison store URL"
        disabled={loading}
        class="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-slate-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none disabled:opacity-50 dark:border-gray-600 dark:bg-slate-800 dark:text-slate-200"
      />
      <button
        type="submit"
        disabled={loading || compareUrl.trim() === ""}
        class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500"
      >
        {#if loading}
          <Loader2 class="h-4 w-4 animate-spin" />
        {:else}
          <Search class="h-4 w-4" />
        {/if}
        Compare
      </button>
      {#if hasComparison}
        <button
          type="button"
          onclick={clearComparison}
          class="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Clear comparison"
        >
          <X class="h-4 w-4" />
        </button>
      {/if}
    </form>
    {#if error !== null}
      <p class="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
    {/if}
  </div>

  {#if hasComparison}
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-slate-800">
            <th
              scope="col"
              class="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300"
            >
              Metric
            </th>
            <th
              scope="col"
              class="px-4 py-3 text-right font-semibold text-blue-600 dark:text-blue-400"
            >
              {primaryMeta?.name ?? primaryDomain}
            </th>
            <th
              scope="col"
              class="px-4 py-3 text-right font-semibold text-purple-600 dark:text-purple-400"
            >
              {compareMeta?.name ?? compareDomain}
            </th>
          </tr>
        </thead>
        <tbody>
          {#each stats as stat (stat.label)}
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <td class="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                {stat.label}
              </td>
              <td class="px-4 py-2.5 text-right">{stat.primary}</td>
              <td class="px-4 py-2.5 text-right">{stat.compare}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div class="rounded-lg border border-blue-200 p-4 dark:border-blue-800">
        <h3 class="mb-2 font-semibold text-blue-600 dark:text-blue-400">
          {primaryMeta?.name ?? primaryDomain}
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {primaryProducts.length} products, {primaryProducts.reduce(
            (a, p) => a + p.variants.length,
            0,
          )}
          variants
        </p>
        <div class="mt-2 flex gap-2">
          <Badge
            variant="inStock"
            label="{String(
              primaryProducts.filter((p) => p.variants.some((v) => v.available)).length,
            )} in stock"
          />
          <Badge
            variant="outOfStock"
            label="{String(
              primaryProducts.filter((p) => !p.variants.some((v) => v.available)).length,
            )} out"
          />
        </div>
      </div>
      <div class="rounded-lg border border-purple-200 p-4 dark:border-purple-800">
        <h3 class="mb-2 font-semibold text-purple-600 dark:text-purple-400">
          {compareMeta?.name ?? compareDomain}
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {compareProducts.length} products, {compareProducts.reduce(
            (a, p) => a + p.variants.length,
            0,
          )}
          variants
        </p>
        <div class="mt-2 flex gap-2">
          <Badge
            variant="inStock"
            label="{String(
              compareProducts.filter((p) => p.variants.some((v) => v.available)).length,
            )} in stock"
          />
          <Badge
            variant="outOfStock"
            label="{String(
              compareProducts.filter((p) => !p.variants.some((v) => v.available)).length,
            )} out"
          />
        </div>
      </div>
    </div>
  {:else if !loading}
    <p class="text-center text-sm text-gray-500 dark:text-gray-400">
      Enter another Shopify store URL above to compare product catalogs side by side.
    </p>
  {/if}
</div>
