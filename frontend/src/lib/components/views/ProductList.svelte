<script lang="ts">
  import SortableTable from "../shared/SortableTable.svelte";
  import Badge from "../shared/Badge.svelte";
  import PriceDisplay from "../shared/PriceDisplay.svelte";
  import type { ProductListRow } from "../../types/shopify-types.js";

  interface Props {
    data: ProductListRow[];
    currency?: string | undefined;
  }

  const { data, currency = undefined }: Props = $props();

  const columns = [
    { key: "category", label: "Category" },
    { key: "title", label: "Product" },
    { key: "option", label: "Option" },
    {
      key: "price",
      label: "Price",
      align: "right" as const,
      sortValue: (r: ProductListRow) => r.price,
    },
    {
      key: "originalPrice",
      label: "Original Price",
      align: "right" as const,
      sortValue: (r: ProductListRow) => r.originalPrice,
    },
    { key: "inStock", label: "In Stock", sortValue: (r: ProductListRow) => r.inStock },
    { key: "url", label: "URL" },
    {
      key: "weightGrams",
      label: "Weight (g)",
      align: "right" as const,
      sortValue: (r: ProductListRow) => r.weightGrams,
    },
    { key: "createdAt", label: "Created" },
  ];
</script>

<SortableTable
  {columns}
  {data}
  defaultSortKey="category"
  rowClass={(r) => (r.inStock ? "" : "bg-red-50 dark:bg-red-950/30")}
>
  {#snippet cell({ row, column })}
    {#if column.key === "price"}
      <PriceDisplay
        price={row.price}
        {currency}
      />
    {:else if column.key === "originalPrice"}
      {#if row.originalPrice !== null}
        <span class="text-gray-400 line-through"
          ><PriceDisplay
            price={row.originalPrice}
            {currency}
          /></span
        >
      {/if}
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
        class="text-xs text-gray-500 hover:underline dark:text-gray-400"
        >{row.url.split("/products/")[1]?.split("?")[0] ?? ""}</a
      >
    {:else if column.key === "weightGrams"}
      {row.weightGrams > 0 ? `${String(row.weightGrams)} g` : "—"}
    {:else if column.key === "createdAt"}
      {row.createdAt.slice(0, 10)}
    {:else if column.key === "category"}
      {row.category}
    {:else if column.key === "title"}
      {row.title}
    {:else if column.key === "option"}
      {row.option}
    {/if}
  {/snippet}
</SortableTable>
