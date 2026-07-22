<script lang="ts">
  import { Search, X, Filter } from "@lucide/svelte";

  interface Props {
    searchQuery: string;
    categories: string[];
    selectedCategory: string;
    stockFilter: "all" | "inStock" | "outOfStock";
    onchange: (query: string, category: string, stock: "all" | "inStock" | "outOfStock") => void;
  }

  let {
    searchQuery = $bindable(),
    categories,
    selectedCategory = $bindable(),
    stockFilter = $bindable(),
    onchange,
  }: Props = $props();

  function handleInput() {
    onchange(searchQuery, selectedCategory, stockFilter);
  }

  function clearSearch() {
    searchQuery = "";
    onchange(searchQuery, selectedCategory, stockFilter);
  }
</script>

<div class="flex flex-wrap items-center gap-3">
  <div class="relative min-w-48 flex-1">
    <Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
    <input
      type="text"
      bind:value={searchQuery}
      oninput={handleInput}
      placeholder="Search products..."
      aria-label="Search products"
      class="w-full rounded-lg border border-gray-300 bg-white py-2 pr-8 pl-9 text-sm text-slate-800 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-600 dark:bg-slate-800 dark:text-slate-200"
    />
    {#if searchQuery !== ""}
      <button
        type="button"
        onclick={clearSearch}
        class="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        aria-label="Clear search"
      >
        <X class="h-4 w-4" />
      </button>
    {/if}
  </div>

  <div class="flex items-center gap-2">
    <Filter class="h-4 w-4 text-gray-400" />
    <select
      bind:value={selectedCategory}
      onchange={handleInput}
      aria-label="Filter by category"
      class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-slate-800 dark:text-slate-200"
    >
      <option value="">All Categories</option>
      {#each categories as cat (cat)}
        <option value={cat}>{cat}</option>
      {/each}
    </select>

    <select
      bind:value={stockFilter}
      onchange={handleInput}
      aria-label="Filter by stock status"
      class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-slate-800 dark:text-slate-200"
    >
      <option value="all">All Stock</option>
      <option value="inStock">In Stock</option>
      <option value="outOfStock">Out of Stock</option>
    </select>
  </div>
</div>
