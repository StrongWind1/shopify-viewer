<script lang="ts">
  import SortableTable from "../shared/SortableTable.svelte";
  import type { PriceAnalysis, CategoryPricing } from "../../types/shopify-types.js";
  import { formatPrice } from "../../utils/price-utils.js";

  interface Props {
    data: PriceAnalysis;
    currency?: string | undefined;
  }

  const { data, currency = undefined }: Props = $props();

  const stats = $derived([
    { label: "Total Products", value: String(data.totalProducts) },
    { label: "Total Variants", value: String(data.totalVariants) },
    { label: "Average Price", value: formatPrice(data.averagePrice, currency) },
    { label: "Median Price", value: formatPrice(data.medianPrice, currency) },
    { label: "Lowest Price", value: formatPrice(data.minPrice, currency) },
    { label: "Highest Price", value: formatPrice(data.maxPrice, currency) },
  ]);

  const catColumns = [
    { key: "name", label: "Category" },
    {
      key: "productCount",
      label: "Products",
      align: "right" as const,
      sortValue: (r: CategoryPricing) => r.productCount,
    },
    {
      key: "averagePrice",
      label: "Avg Price",
      align: "right" as const,
      sortValue: (r: CategoryPricing) => r.averagePrice,
    },
    {
      key: "minPrice",
      label: "Min",
      align: "right" as const,
      sortValue: (r: CategoryPricing) => r.minPrice,
    },
    {
      key: "maxPrice",
      label: "Max",
      align: "right" as const,
      sortValue: (r: CategoryPricing) => r.maxPrice,
    },
    {
      key: "spread",
      label: "Spread",
      align: "right" as const,
      sortValue: (r: CategoryPricing) => r.spread,
    },
  ];

  const chartMaxCount = $derived(Math.max(...data.distribution.map((b) => b.count), 1));
</script>

<div class="space-y-8">
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
    {#each stats as stat}
      <div class="rounded-lg border border-gray-200 p-4 text-center dark:border-gray-700">
        <p class="text-2xl font-bold text-slate-800 dark:text-slate-200">{stat.value}</p>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
      </div>
    {/each}
  </div>

  <section>
    <h3 class="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">Sale Analysis</h3>
    {#if data.saleItems.count === 0}
      <p class="text-gray-500 dark:text-gray-400">No items are currently on sale.</p>
    {:else}
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <p class="text-lg font-bold text-slate-800 dark:text-slate-200">
            {data.saleItems.count} of {data.saleItems.totalVariants}
          </p>
          <p class="text-xs text-gray-500">Items on Sale ({data.saleItems.percentage}%)</p>
        </div>
        <div class="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <p class="text-lg font-bold text-slate-800 dark:text-slate-200">
            {data.saleItems.averageDiscount}%
          </p>
          <p class="text-xs text-gray-500">Average Discount</p>
        </div>
        <div class="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <p class="text-lg font-bold text-slate-800 dark:text-slate-200">
            {data.saleItems.biggestDiscount.percentage}%
          </p>
          <p
            class="truncate text-xs text-gray-500"
            title={data.saleItems.biggestDiscount.productTitle}
          >
            Biggest: {data.saleItems.biggestDiscount.productTitle}
          </p>
        </div>
        <div class="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <p class="text-lg font-bold text-slate-800 dark:text-slate-200">
            {formatPrice(data.saleItems.totalSavings, currency)}
          </p>
          <p class="text-xs text-gray-500">Total Savings</p>
        </div>
      </div>
    {/if}
  </section>

  <section>
    <h3 class="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">Price by Category</h3>
    <SortableTable
      columns={catColumns}
      data={data.categoryPricing}
      defaultSortKey="averagePrice"
      defaultSortDir="desc"
    >
      {#snippet children({ row, column })}
        {#if column.key === "name"}
          {row.name}
        {:else if column.key === "productCount"}
          {row.productCount}
        {:else if column.key === "averagePrice"}
          {formatPrice(row.averagePrice, currency)}
        {:else if column.key === "minPrice"}
          {formatPrice(row.minPrice, currency)}
        {:else if column.key === "maxPrice"}
          {formatPrice(row.maxPrice, currency)}
        {:else if column.key === "spread"}
          {formatPrice(row.spread, currency)}
        {/if}
      {/snippet}
    </SortableTable>
  </section>

  {#if data.distribution.length > 0}
    <section>
      <h3 class="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
        Price Distribution
      </h3>
      <div class="overflow-x-auto rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <svg
          viewBox="0 0 {data.distribution.length * 50} 200"
          class="h-48 w-full"
          role="img"
          aria-label="Price distribution histogram"
        >
          {#each data.distribution as bucket, i}
            {@const barHeight = (bucket.count / chartMaxCount) * 160}
            <g transform="translate({i * 50}, 0)">
              <rect
                x="5"
                y={180 - barHeight}
                width="40"
                height={barHeight}
                class="fill-blue-500 dark:fill-blue-400"
                rx="2"
              />
              <text
                x="25"
                y={175 - barHeight}
                text-anchor="middle"
                class="fill-gray-600 dark:fill-gray-400"
                font-size="10"
              >
                {bucket.count}
              </text>
              <text
                x="25"
                y="196"
                text-anchor="middle"
                class="fill-gray-500 dark:fill-gray-400"
                font-size="8"
              >
                {bucket.label}
              </text>
            </g>
          {/each}
        </svg>
      </div>
    </section>
  {/if}

  <div class="grid gap-6 md:grid-cols-2">
    <section>
      <h3 class="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">Most Expensive</h3>
      <ol class="space-y-2">
        {#each data.mostExpensive as item}
          <li class="flex items-center gap-3 text-sm">
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold dark:bg-gray-800"
              >{item.rank}</span
            >
            <span class="flex-1 truncate text-slate-800 dark:text-slate-200">{item.title}</span>
            <span class="font-semibold">{formatPrice(item.price, currency)}</span>
          </li>
        {/each}
      </ol>
    </section>
    <section>
      <h3 class="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">Least Expensive</h3>
      <ol class="space-y-2">
        {#each data.leastExpensive as item}
          <li class="flex items-center gap-3 text-sm">
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold dark:bg-gray-800"
              >{item.rank}</span
            >
            <span class="flex-1 truncate text-slate-800 dark:text-slate-200">{item.title}</span>
            <span class="font-semibold">{formatPrice(item.price, currency)}</span>
          </li>
        {/each}
      </ol>
    </section>
  </div>
</div>
