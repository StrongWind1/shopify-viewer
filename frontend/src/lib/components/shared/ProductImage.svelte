<script lang="ts">
  import { thumbnailUrl } from "../../utils/image-utils.js";
  import { Package } from "@lucide/svelte";

  interface Props {
    src: string | null;
    alt: string;
    size?: number | undefined;
  }

  const { src, alt, size = 400 }: Props = $props();
  const thumbSrc = $derived(src !== null ? thumbnailUrl(src, size) : null);
  let hasError = $state(false);
</script>

{#if thumbSrc !== null && !hasError}
  <img
    src={thumbSrc}
    {alt}
    loading="lazy"
    class="h-full w-full object-cover"
    onerror={() => {
      hasError = true;
    }}
  />
{:else}
  <div class="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
    <Package class="h-12 w-12 text-gray-300 dark:text-gray-600" />
  </div>
{/if}
