<script lang="ts">
  import { ChevronRight, ChevronDown } from "@lucide/svelte";
  import { SvelteSet } from "svelte/reactivity";
  import Badge from "../shared/Badge.svelte";
  import type { CategoryGroup, ShopifyCollection } from "../../types/shopify-types.js";
  import { formatPrice } from "../../utils/price-utils.js";

  interface Props {
    groups: CategoryGroup[];
    collections?: ShopifyCollection[];
    currency?: string | undefined;
  }

  const { groups, collections = [], currency = undefined }: Props = $props();

  let expanded = new SvelteSet<string>();

  function toggle(name: string) {
    if (expanded.has(name)) {
      expanded.delete(name);
    } else {
      expanded.add(name);
    }
  }

  function expandAll() {
    expanded = new SvelteSet(groups.map((g) => g.name));
  }
  function collapseAll() {
    expanded.clear();
  }

  function rateColor(rate: number): string {
    if (rate >= 80) return "text-green-600 dark:text-green-400";
    if (rate >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  }
</script>

<div class="space-y-2">
  <div class="flex justify-end gap-2 text-xs">
    <button
      type="button"
      onclick={expandAll}
      class="cursor-pointer text-blue-600 hover:underline dark:text-blue-400">Expand All</button
    >
    <button
      type="button"
      onclick={collapseAll}
      class="cursor-pointer text-blue-600 hover:underline dark:text-blue-400">Collapse All</button
    >
  </div>

  {#each groups as group (group.name)}
    {@const isOpen = expanded.has(group.name)}
    <div class="rounded-lg border border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onclick={() => {
          toggle(group.name);
        }}
        class="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        {#if isOpen}
          <ChevronDown class="h-4 w-4 shrink-0 text-gray-400" />
        {:else}
          <ChevronRight class="h-4 w-4 shrink-0 text-gray-400" />
        {/if}
        <span class="flex-1 font-semibold text-slate-800 dark:text-slate-200">{group.name}</span>
        <span class="text-sm text-gray-500 dark:text-gray-400">{group.productCount} products</span>
        <span class="text-sm text-gray-500 dark:text-gray-400">{group.variantCount} variants</span>
        <span class="text-sm {rateColor(group.inStockRate)}">{group.inStockRate}% in stock</span>
        <span class="text-sm text-gray-500 dark:text-gray-400">
          {formatPrice(group.priceMin, currency)} – {formatPrice(group.priceMax, currency)}
        </span>
      </button>

      {#if isOpen}
        <div class="border-t border-gray-200 dark:border-gray-700">
          <ul class="divide-y divide-gray-100 dark:divide-gray-800">
            {#each group.products as product (product.id)}
              <li class="flex items-center justify-between px-6 py-2 text-sm">
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener"
                  class="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {product.title}
                </a>
                <div class="flex items-center gap-3">
                  <span class="text-gray-600 dark:text-gray-400"
                    >{formatPrice(product.price, currency)}</span
                  >
                  <Badge
                    variant={product.inStock ? "inStock" : "outOfStock"}
                    label={product.inStock ? "YES" : "NO"}
                  />
                </div>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {/each}

  {#if collections.length > 0}
    <div class="mt-8">
      <h3 class="mb-3 text-base font-semibold text-slate-800 dark:text-slate-200">
        Collections ({collections.length})
      </h3>
      <div class="rounded-lg border border-gray-200 dark:border-gray-700">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-slate-800">
              <th
                scope="col"
                class="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300"
                >Collection</th
              >
              <th
                scope="col"
                class="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-300"
                >Products</th
              >
              <th
                scope="col"
                class="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300"
                >Last Updated</th
              >
            </tr>
          </thead>
          <tbody>
            {#each collections as col (col.handle)}
              <tr class="border-b border-gray-100 dark:border-gray-800">
                <td class="px-4 py-2 text-slate-800 dark:text-slate-200">{col.title}</td>
                <td class="px-4 py-2 text-right text-gray-600 dark:text-gray-400"
                  >{col.products_count}</td
                >
                <td class="px-4 py-2 text-gray-500 dark:text-gray-400"
                  >{col.updated_at.slice(0, 10)}</td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>
