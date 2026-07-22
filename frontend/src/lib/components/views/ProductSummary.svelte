<script lang="ts">
  import SortableTable from "../shared/SortableTable.svelte";
  import Badge from "../shared/Badge.svelte";
  import PriceDisplay from "../shared/PriceDisplay.svelte";
  import type { ProductSummary } from "../../types/shopify-types.js";

  interface Props {
    data: ProductSummary[];
    currency?: string | undefined;
  }

  const { data, currency = undefined }: Props = $props();

  const columns = [
    { key: "category", label: "Category" },
    { key: "title", label: "Product" },
    {
      key: "price",
      label: "Price",
      align: "right" as const,
      sortValue: (r: ProductSummary) => r.price,
    },
    { key: "inStock", label: "In Stock", sortValue: (r: ProductSummary) => r.inStock },
    { key: "url", label: "URL" },
  ];
</script>

{#if data.length === 0}
  <p class="py-12 text-center text-gray-500 dark:text-gray-400">
    This store has no published products.
  </p>
{:else}
  <SortableTable
    {columns}
    {data}
    defaultSortKey="category"
    rowClass={(r) => (r.inStock ? "" : "bg-red-50 dark:bg-red-950/30")}
  >
    {#snippet children({ row, column })}
      {#if column.key === "title"}
        <a
          href={row.url}
          target="_blank"
          rel="noopener"
          class="text-blue-600 hover:underline dark:text-blue-400">{row.title}</a
        >
      {:else if column.key === "price"}
        <PriceDisplay
          price={row.price}
          {currency}
        />
      {:else if column.key === "inStock"}
        <Badge
          variant={row.inStock ? "inStock" : "outOfStock"}
          label={row.inStock ? "YES" : "NO"}
        />
      {:else if column.key === "url"}
        <a
          href={row.url}
          target="_blank"
          rel="noopener"
          class="text-xs text-gray-500 hover:underline dark:text-gray-400">{row.handle}</a
        >
      {:else if column.key === "category"}
        {row.category}
      {/if}
    {/snippet}
  </SortableTable>
{/if}
