<script lang="ts">
  import { TrendingUp, TrendingDown, Minus, History } from "@lucide/svelte";
  import Badge from "../shared/Badge.svelte";
  import {
    getSnapshots,
    computeChanges,
    type PriceSnapshot,
    type PriceChange,
  } from "../../utils/price-history.js";
  import { formatPrice } from "../../utils/price-utils.js";

  interface Props {
    domain: string;
    currency?: string | undefined;
  }

  const { domain, currency = undefined }: Props = $props();

  let snapshots = $state<PriceSnapshot[]>([]);
  let selectedIdx = $state(0);
  let changes = $state<PriceChange[]>([]);
  let loading = $state(true);

  $effect(() => {
    void loadHistory();
  });

  async function loadHistory() {
    loading = true;
    snapshots = await getSnapshots(domain);
    if (snapshots.length >= 2) {
      const latest = snapshots[0];
      const previous = snapshots[1];
      if (latest !== undefined && previous !== undefined) {
        changes = computeChanges(previous.products, latest.products);
      }
    }
    loading = false;
  }

  function selectSnapshot(idx: number) {
    selectedIdx = idx;
    const current = snapshots[0];
    const previous = snapshots[idx];
    if (current !== undefined && previous !== undefined && idx > 0) {
      changes = computeChanges(previous.products, current.products);
    } else {
      changes = [];
    }
  }

  function formatTs(iso: string): string {
    return new Date(iso).toLocaleString();
  }
</script>

<div class="space-y-6">
  {#if loading}
    <p class="text-center text-gray-500 dark:text-gray-400">Loading history...</p>
  {:else if snapshots.length < 2}
    <div class="rounded-lg border border-gray-200 p-8 text-center dark:border-gray-700">
      <History class="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
      <p class="text-gray-500 dark:text-gray-400">
        {#if snapshots.length === 0}
          No price history yet. Fetch this store's products to start tracking.
        {:else}
          Only one snapshot recorded. Fetch again later to see changes.
        {/if}
      </p>
    </div>
  {:else}
    <div class="flex items-center gap-3">
      <span class="text-sm text-gray-500 dark:text-gray-400">Compare current to:</span>
      <select
        onchange={(e) => {
          selectSnapshot(parseInt((e.target as HTMLSelectElement).value, 10));
        }}
        class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-slate-800 dark:text-slate-200"
      >
        {#each snapshots.slice(1) as snap, i (snap.timestamp)}
          <option
            value={i + 1}
            selected={selectedIdx === i + 1}
          >
            {formatTs(snap.timestamp)} ({snap.products.length} products)
          </option>
        {/each}
      </select>
    </div>

    {#if changes.length === 0}
      <p class="text-center text-gray-500 dark:text-gray-400">
        No price or stock changes detected.
      </p>
    {:else}
      <p class="text-sm text-gray-500 dark:text-gray-400">
        {changes.length} change{changes.length === 1 ? "" : "s"} detected
      </p>
      <div class="space-y-2">
        {#each changes as change (change.id)}
          <div
            class="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700"
          >
            <div class="flex-1">
              <p class="font-medium text-slate-800 dark:text-slate-200">{change.title}</p>
              <div class="mt-1 flex items-center gap-2 text-sm">
                <span class="text-gray-500">{formatPrice(change.oldPrice, currency)}</span>
                <span class="text-gray-400">→</span>
                <span class="font-semibold text-slate-800 dark:text-slate-200">
                  {formatPrice(change.newPrice, currency)}
                </span>
                {#if change.diff < 0}
                  <span class="inline-flex items-center gap-0.5 text-green-600">
                    <TrendingDown class="h-3.5 w-3.5" />
                    {formatPrice(Math.abs(change.diff), currency)}
                  </span>
                {:else if change.diff > 0}
                  <span class="inline-flex items-center gap-0.5 text-red-600">
                    <TrendingUp class="h-3.5 w-3.5" />
                    +{formatPrice(change.diff, currency)}
                  </span>
                {:else}
                  <Minus class="h-3.5 w-3.5 text-gray-400" />
                {/if}
              </div>
            </div>
            <div>
              {#if change.wasAvailable && !change.nowAvailable}
                <Badge
                  variant="outOfStock"
                  label="Now OOS"
                />
              {:else if !change.wasAvailable && change.nowAvailable}
                <Badge
                  variant="inStock"
                  label="Back in Stock"
                />
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
