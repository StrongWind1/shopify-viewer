<script lang="ts">
  interface Props {
    fetchedAt: Date | null;
  }

  const { fetchedAt }: Props = $props();

  const relativeTime = $derived.by(() => {
    if (fetchedAt === null) return null;
    const diff = Date.now() - fetchedAt.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${String(mins)} minute${mins === 1 ? "" : "s"} ago`;
    const hours = Math.floor(mins / 60);
    return `${String(hours)} hour${hours === 1 ? "" : "s"} ago`;
  });
</script>

<footer class="flex items-center justify-between border-t border-gray-200 px-4 py-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400 sm:px-6">
  <span>
    {#if relativeTime !== null}
      Last fetched: {relativeTime}
    {/if}
  </span>
  <a
    href="https://github.com/StrongWind1/shopify-viewer"
    target="_blank"
    rel="noopener"
    class="hover:text-gray-700 dark:hover:text-gray-300"
  >
    Source
  </a>
</footer>
