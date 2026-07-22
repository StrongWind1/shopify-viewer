<script lang="ts">
  import { Search, Loader2, Clock, X } from "@lucide/svelte";
  import type { RecentStore } from "../types/shopify-types.js";

  interface Props {
    value: string;
    disabled: boolean;
    error: string | null;
    recentStores: RecentStore[];
    onsubmit: (url: string) => void;
    onclear: () => void;
  }

  let { value = $bindable(), disabled, error, recentStores, onsubmit, onclear }: Props = $props();

  let showDropdown = $state(false);
  let inputEl: HTMLInputElement | undefined = $state(undefined);

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (value.trim() !== "") {
      showDropdown = false;
      onsubmit(value);
    }
  }

  function selectRecent(domain: string) {
    value = domain;
    showDropdown = false;
    onsubmit(domain);
  }

  function handleFocus() {
    if (recentStores.length > 0) {
      showDropdown = true;
    }
  }

  function handleBlur() {
    setTimeout(() => {
      showDropdown = false;
    }, 150);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      showDropdown = false;
    }
  }

  function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${String(mins)}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${String(hours)}h ago`;
    const days = Math.floor(hours / 24);
    return `${String(days)}d ago`;
  }
</script>

<form
  onsubmit={handleSubmit}
  class="relative w-full max-w-2xl"
>
  <div class="flex gap-2">
    <div class="relative flex-1">
      <input
        bind:this={inputEl}
        bind:value
        type="text"
        {disabled}
        placeholder="Enter a Shopify store URL (e.g., lttstore.com)"
        maxlength={253}
        class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm text-slate-800 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50 dark:border-gray-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-gray-500"
        onfocus={handleFocus}
        onblur={handleBlur}
        onkeydown={handleKeydown}
        oninput={() => {
          if (error !== null) onclear();
        }}
      />
      {#if value !== "" && !disabled}
        <button
          type="button"
          onclick={() => {
            value = "";
            inputEl?.focus();
          }}
          class="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Clear input"
        >
          <X class="h-4 w-4" />
        </button>
      {/if}
    </div>

    <button
      type="submit"
      {disabled}
      class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
    >
      {#if disabled}
        <Loader2 class="h-4 w-4 animate-spin" />
      {:else}
        <Search class="h-4 w-4" />
      {/if}
      Fetch Products
    </button>
  </div>

  {#if error !== null}
    <p class="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
  {/if}

  {#if showDropdown && recentStores.length > 0 && !disabled}
    <div
      class="absolute top-full right-0 left-0 z-10 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-slate-800"
    >
      <ul class="max-h-64 overflow-y-auto py-1">
        {#each recentStores.slice(0, 10) as recent (recent.domain)}
          <li>
            <button
              type="button"
              class="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              onmousedown={(e) => {
                e.preventDefault();
                selectRecent(recent.domain);
              }}
            >
              <Clock class="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span class="flex-1 truncate">
                <span class="font-medium text-slate-800 dark:text-slate-200">{recent.name}</span>
                <span class="ml-1 text-gray-400">{recent.domain}</span>
              </span>
              <span class="shrink-0 text-xs text-gray-400">{relativeTime(recent.lastVisited)}</span>
            </button>
          </li>
        {/each}
      </ul>
      <button
        type="button"
        class="w-full cursor-pointer border-t border-gray-200 px-4 py-2 text-center text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
        onmousedown={(e) => {
          e.preventDefault();
          onclear();
        }}
      >
        Clear history
      </button>
    </div>
  {/if}
</form>
