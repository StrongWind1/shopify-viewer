<script
  lang="ts"
  generics="T"
>
  import { onMount } from "svelte";

  interface Props {
    items: T[];
    itemHeight?: number;
    children: import("svelte").Snippet<[{ item: T; index: number }]>;
  }

  const { items, itemHeight = 40, children }: Props = $props();

  const BUFFER = 5;
  const THRESHOLD = 200;

  let containerEl: HTMLDivElement | undefined = $state(undefined);
  let scrollTop = $state(0);
  let containerHeight = $state(600);

  const useVirtual = $derived(items.length > THRESHOLD);
  const totalHeight = $derived(items.length * itemHeight);

  const startIndex = $derived.by(() => {
    if (!useVirtual) return 0;
    return Math.max(0, Math.floor(scrollTop / itemHeight) - BUFFER);
  });

  const endIndex = $derived.by(() => {
    if (!useVirtual) return items.length;
    const visible = Math.ceil(containerHeight / itemHeight);
    return Math.min(items.length, Math.floor(scrollTop / itemHeight) + visible + BUFFER);
  });

  const visibleItems = $derived(items.slice(startIndex, endIndex));
  const offsetY = $derived(startIndex * itemHeight);

  function handleScroll() {
    if (containerEl !== undefined) {
      scrollTop = containerEl.scrollTop;
    }
  }

  onMount(() => {
    if (containerEl !== undefined) {
      containerHeight = containerEl.clientHeight;
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          containerHeight = entry.contentRect.height;
        }
      });
      observer.observe(containerEl);
      return () => {
        observer.disconnect();
      };
    }
  });
</script>

{#if useVirtual}
  <div
    bind:this={containerEl}
    onscroll={handleScroll}
    class="max-h-[70vh] overflow-y-auto"
  >
    <div style="height: {totalHeight}px; position: relative;">
      <div style="position: absolute; top: {offsetY}px; left: 0; right: 0;">
        {#each visibleItems as item, i (startIndex + i)}
          {@render children({ item, index: startIndex + i })}
        {/each}
      </div>
    </div>
  </div>
{:else}
  {#each items as item, i (i)}
    {@render children({ item, index: i })}
  {/each}
{/if}
