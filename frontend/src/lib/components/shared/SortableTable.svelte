<script lang="ts" generics="T">
  import { ChevronUp, ChevronDown } from "@lucide/svelte";

  interface Column<Row> {
    key: string;
    label: string;
    sortable?: boolean;
    align?: "left" | "right";
    sortValue?: (row: Row) => string | number | boolean | null;
  }

  interface Props {
    columns: Column<T>[];
    data: T[];
    defaultSortKey?: string;
    defaultSortDir?: "asc" | "desc";
    rowClass?: (row: T) => string;
  }

  type Snippet = import("svelte").Snippet<[{ row: T; column: Column<T> }]>;

  const props: Props & { children: Snippet } = $props();
  const { columns, data, children } = $derived(props);
  const rowClass = $derived(props.rowClass ?? (() => ""));
  const initialSortKey = $derived(props.defaultSortKey ?? "");
  const initialSortDir = $derived(props.defaultSortDir ?? "asc");

  let sortKey = $state(props.defaultSortKey ?? "");
  let sortDir = $state<"asc" | "desc">(props.defaultSortDir ?? "asc");
  let clickCount = $state(0);

  function handleSort(key: string) {
    if (sortKey === key) {
      clickCount++;
      if (clickCount === 1) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortKey = initialSortKey;
        sortDir = initialSortDir;
        clickCount = 0;
      }
    } else {
      sortKey = key;
      sortDir = "asc";
      clickCount = 0;
    }
  }

  const sortedData = $derived.by(() => {
    if (sortKey === "") return data;
    const col = columns.find((c) => c.key === sortKey);
    if (col === undefined) return data;

    const getValue = col.sortValue ?? ((row: T) => (row as Record<string, unknown>)[col.key]);
    const dir = sortDir === "asc" ? 1 : -1;

    return [...data].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb) * dir;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      if (typeof va === "boolean" && typeof vb === "boolean") return (Number(va) - Number(vb)) * dir;
      return 0;
    });
  });
</script>

<div class="overflow-x-auto">
  <table class="min-w-full text-sm">
    <thead>
      <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-slate-800">
        {#each columns as col}
          <th
            scope="col"
            class="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 {col.align === 'right' ? 'text-right' : 'text-left'}"
            aria-sort={sortKey === col.key ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
          >
            {#if col.sortable !== false}
              <button
                type="button"
                class="inline-flex cursor-pointer items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                onclick={() => { handleSort(col.key); }}
              >
                {col.label}
                {#if sortKey === col.key}
                  {#if sortDir === "asc"}
                    <ChevronUp class="h-3.5 w-3.5" />
                  {:else}
                    <ChevronDown class="h-3.5 w-3.5" />
                  {/if}
                {/if}
              </button>
            {:else}
              {col.label}
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each sortedData as row}
        <tr class="border-b border-gray-100 dark:border-gray-800 {rowClass(row)}">
          {#each columns as column}
            <td class="px-3 py-2 {column.align === 'right' ? 'text-right' : ''}">
              {@render children({ row, column })}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
