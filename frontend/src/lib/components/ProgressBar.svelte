<script lang="ts">
  interface Props {
    current: number;
    total: number;
    label?: string;
  }

  const { current, total, label = "Fetching products" }: Props = $props();

  const percentage = $derived(total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0);
  const isIndeterminate = $derived(total <= 0);
</script>

<div class="w-full">
  <div class="mb-1 flex justify-between text-sm text-gray-600 dark:text-gray-400">
    <span aria-live="polite"
      >{label}... {current > 0 ? `${String(current)}` : ""}{total > 0
        ? ` of ~${String(total)}`
        : ""}</span
    >
    {#if !isIndeterminate}
      <span>{percentage}%</span>
    {/if}
  </div>
  <div
    class="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
    role="progressbar"
    aria-valuenow={isIndeterminate ? undefined : percentage}
    aria-valuemin={0}
    aria-valuemax={100}
  >
    {#if isIndeterminate}
      <div class="h-full w-1/3 animate-pulse rounded-full bg-blue-500"></div>
    {:else}
      <div
        class="h-full rounded-full bg-blue-500 transition-all duration-300"
        style="width: {percentage}%"
      ></div>
    {/if}
  </div>
</div>
