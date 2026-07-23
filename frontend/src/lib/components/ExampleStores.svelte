<script lang="ts">
  import { ChevronDown, ChevronRight, ExternalLink } from "@lucide/svelte";

  interface Props {
    onselect: (domain: string) => void;
  }

  const { onselect }: Props = $props();

  interface StoreEntry {
    domain: string;
    name: string;
    products: number;
    currency: string;
    country: string;
  }

  let expanded = $state(false);
  let stores = $state<StoreEntry[]>([]);
  let loaded = $state(false);
  let sortKey = $state<"name" | "domain" | "products" | "country">("products");
  let sortDir = $state<"asc" | "desc">("desc");
  let searchQuery = $state("");
  let currentPage = $state(0);
  const pageSize = 25;

  async function toggle() {
    expanded = !expanded;
    if (expanded && !loaded) {
      try {
        const base = import.meta.env.BASE_URL;
        const r = await fetch(`${base}example-stores.json`);
        if (r.ok) {
          stores = (await r.json()) as StoreEntry[];
        }
      } catch {
        // File not available
      } finally {
        loaded = true;
      }
    }
  }

  function handleSort(key: typeof sortKey) {
    if (sortKey === key) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortKey = key;
      sortDir = key === "products" ? "desc" : "asc";
    }
    currentPage = 0;
  }

  const filtered = $derived.by(() => {
    const q = searchQuery.toLowerCase().trim();
    if (q === "") return stores;
    return stores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.domain.toLowerCase().includes(q) ||
        s.country.toLowerCase().includes(q),
    );
  });

  const sorted = $derived.by(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  });

  const totalPages = $derived(Math.ceil(sorted.length / pageSize));
  const pageData = $derived(sorted.slice(currentPage * pageSize, (currentPage + 1) * pageSize));

  function indicator(key: typeof sortKey): string {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }
</script>

<div class="w-full">
  <button
    type="button"
    onclick={toggle}
    class="inline-flex cursor-pointer items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
  >
    {#if expanded}
      <ChevronDown class="h-4 w-4" />
    {:else}
      <ChevronRight class="h-4 w-4" />
    {/if}
    Need examples? Browse {stores.length > 0 ? stores.length : ""} known Shopify stores
  </button>

  {#if expanded}
    <div class="mt-4 space-y-3">
      <p class="text-xs text-gray-400 dark:text-gray-500">
        Shopify stores found in the Tranco top 100k websites. Click any row to load it. This is not
        an endorsement of any store — these are publicly accessible storefronts discovered by
        automated scanning.
      </p>

      {#if !loaded}
        <p class="text-center text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      {:else if stores.length === 0}
        <p class="text-center text-sm text-gray-500 dark:text-gray-400">
          No example stores available.
        </p>
      {:else}
        <div class="flex flex-wrap items-center gap-3">
          <input
            type="text"
            bind:value={searchQuery}
            oninput={() => {
              currentPage = 0;
            }}
            placeholder="Filter stores..."
            aria-label="Filter example stores"
            class="min-w-40 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-slate-800 dark:text-slate-200"
          />
          <span class="text-xs text-gray-400">{filtered.length} stores</span>
        </div>

        <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="bg-gray-50 dark:bg-slate-800">
                {#each [{ key: "name", label: "Store", align: "text-left" }, { key: "domain", label: "Domain", align: "text-left" }, { key: "products", label: "Products", align: "text-right" }, { key: "country", label: "Country", align: "text-center" }] as col (col.key)}
                  <th
                    scope="col"
                    class="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 {col.align}"
                  >
                    <button
                      type="button"
                      class="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                      onclick={() => {
                        handleSort(col.key as typeof sortKey);
                      }}
                    >
                      {col.label}{indicator(col.key as typeof sortKey)}
                    </button>
                  </th>
                {/each}
                <th
                  scope="col"
                  class="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-300"
                >
                  Link
                </th>
              </tr>
            </thead>
            <tbody>
              {#each pageData as entry (entry.domain)}
                <tr
                  class="cursor-pointer border-t border-gray-100 hover:bg-blue-50/50 dark:border-gray-800 dark:hover:bg-blue-950/20"
                  onclick={() => {
                    onselect(entry.domain);
                  }}
                >
                  <td class="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                    {entry.name}
                  </td>
                  <td class="px-3 py-2 text-gray-500 dark:text-gray-400">{entry.domain}</td>
                  <td class="px-3 py-2 text-right tabular-nums"
                    >{entry.products.toLocaleString()}</td
                  >
                  <td class="px-3 py-2 text-center">{entry.country}</td>
                  <td class="px-3 py-2 text-center">
                    <a
                      href="?store={encodeURIComponent(entry.domain)}"
                      class="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                      aria-label="View {entry.name}"
                    >
                      <ExternalLink class="inline h-3.5 w-3.5" />
                    </a>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        {#if totalPages > 1}
          <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, sorted.length)} of
              {sorted.length}
            </span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 0}
                onclick={() => {
                  currentPage--;
                }}
                class="cursor-pointer rounded border border-gray-300 px-2 py-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                Prev
              </button>
              <span>{currentPage + 1} / {totalPages}</span>
              <button
                type="button"
                disabled={currentPage >= totalPages - 1}
                onclick={() => {
                  currentPage++;
                }}
                class="cursor-pointer rounded border border-gray-300 px-2 py-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                Next
              </button>
            </div>
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</div>
