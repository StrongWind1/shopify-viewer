<script lang="ts">
  import { Download, Check } from "@lucide/svelte";
  import type {
    ShopifyProduct,
    ProductSummary,
    ProductListRow,
  } from "../../types/shopify-types.js";
  import { productListToCsv, productSummaryToCsv, downloadFile } from "../../utils/csv-export.js";

  interface Props {
    products: ShopifyProduct[];
    summaries: ProductSummary[];
    listRows: ProductListRow[];
    domain: string;
  }

  const { products, summaries, listRows, domain }: Props = $props();

  let downloaded = $state<string | null>(null);

  function dateStr(): string {
    return new Date().toISOString().slice(0, 10);
  }

  function flash(id: string) {
    downloaded = id;
    setTimeout(() => {
      downloaded = null;
    }, 1500);
  }

  function exportProductListCsv() {
    downloadFile(
      productListToCsv(listRows),
      `${domain}-product-list-${dateStr()}.csv`,
      "text/csv; charset=utf-8",
    );
    flash("list-csv");
  }

  function exportSummaryCsv() {
    downloadFile(
      productSummaryToCsv(summaries),
      `${domain}-product-summary-${dateStr()}.csv`,
      "text/csv; charset=utf-8",
    );
    flash("summary-csv");
  }

  function exportRawJson() {
    const content = JSON.stringify(
      { store: domain, fetchedAt: new Date().toISOString(), products },
      null,
      2,
    );
    downloadFile(content, `${domain}-products-raw-${dateStr()}.json`, "application/json");
    flash("raw-json");
  }

  function exportSummaryJson() {
    const content = JSON.stringify(
      { store: domain, fetchedAt: new Date().toISOString(), products: summaries },
      null,
      2,
    );
    downloadFile(content, `${domain}-products-summary-${dateStr()}.json`, "application/json");
    flash("summary-json");
  }

  const buttons = [
    {
      id: "list-csv",
      label: "Product List (CSV)",
      desc: "All variants, one row each",
      action: exportProductListCsv,
    },
    {
      id: "summary-csv",
      label: "Product Summary (CSV)",
      desc: "One row per product",
      action: exportSummaryCsv,
    },
    {
      id: "raw-json",
      label: "Raw Data (JSON)",
      desc: "Original API response",
      action: exportRawJson,
    },
    {
      id: "summary-json",
      label: "Summary Data (JSON)",
      desc: "Transformed summaries",
      action: exportSummaryJson,
    },
  ] as const;
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
  {#each buttons as btn}
    <button
      type="button"
      onclick={btn.action}
      disabled={products.length === 0}
      class="flex cursor-pointer items-center gap-4 rounded-lg border border-gray-200 p-5 text-left transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
    >
      {#if downloaded === btn.id}
        <Check class="h-6 w-6 shrink-0 text-green-500" />
      {:else}
        <Download class="h-6 w-6 shrink-0 text-gray-400" />
      {/if}
      <div>
        <p class="font-semibold text-slate-800 dark:text-slate-200">{btn.label}</p>
        <p class="text-sm text-gray-500 dark:text-gray-400">{btn.desc}</p>
      </div>
    </button>
  {/each}
</div>
