<script lang="ts">
  import { Table, LayoutGrid, FolderTree, BarChart3, Download, List } from "@lucide/svelte";
  import type { ViewId } from "../types/shopify-types.js";
  import type { Component } from "svelte";

  interface Props {
    active: ViewId;
    disabled: boolean;
    onselect: (view: ViewId) => void;
  }

  const { active, disabled, onselect }: Props = $props();

  const tabs: { id: ViewId; label: string; icon: Component }[] = [
    { id: "summary", label: "Summary", icon: List },
    { id: "products", label: "Products", icon: Table },
    { id: "cards", label: "Cards", icon: LayoutGrid },
    { id: "categories", label: "Categories", icon: FolderTree },
    { id: "analysis", label: "Analysis", icon: BarChart3 },
    { id: "export", label: "Export", icon: Download },
  ];
</script>

<nav class="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700" aria-label="View tabs">
  {#each tabs as tab}
    {@const Icon = tab.icon}
    <button
      type="button"
      {disabled}
      class="inline-flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors {active === tab.id
        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'} disabled:cursor-not-allowed disabled:opacity-50"
      onclick={() => { onselect(tab.id); }}
      aria-selected={active === tab.id}
      role="tab"
    >
      <Icon class="h-4 w-4" />
      <span class="hidden sm:inline">{tab.label}</span>
    </button>
  {/each}
</nav>
