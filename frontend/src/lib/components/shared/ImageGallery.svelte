<script lang="ts">
  import { X, ChevronLeft, ChevronRight } from "@lucide/svelte";
  import type { ShopifyImage } from "../../types/shopify-types.js";

  interface Props {
    images: ShopifyImage[];
    title: string;
    onclose: () => void;
  }

  const { images, title, onclose }: Props = $props();

  let currentIndex = $state(0);

  const currentImage = $derived(images[currentIndex]);
  const hasPrev = $derived(currentIndex > 0);
  const hasNext = $derived(currentIndex < images.length - 1);

  function prev() {
    if (hasPrev) currentIndex--;
  }

  function next() {
    if (hasNext) currentIndex++;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") onclose();
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  }

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
  role="dialog"
  aria-modal="true"
  aria-label="Product image gallery for {title}"
  onclick={handleBackdrop}
>
  <div class="relative max-h-[90vh] max-w-4xl">
    <button
      type="button"
      onclick={onclose}
      class="absolute -top-10 right-0 cursor-pointer text-white hover:text-gray-300"
      aria-label="Close gallery"
    >
      <X class="h-6 w-6" />
    </button>

    {#if currentImage !== undefined}
      <img
        src={currentImage.src}
        alt={currentImage.alt ?? title}
        class="max-h-[80vh] max-w-full rounded-lg object-contain"
      />
    {/if}

    {#if images.length > 1}
      <div class="absolute inset-y-0 left-0 flex items-center">
        <button
          type="button"
          onclick={prev}
          disabled={!hasPrev}
          class="m-2 cursor-pointer rounded-full bg-black/50 p-2 text-white hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Previous image"
        >
          <ChevronLeft class="h-6 w-6" />
        </button>
      </div>
      <div class="absolute inset-y-0 right-0 flex items-center">
        <button
          type="button"
          onclick={next}
          disabled={!hasNext}
          class="m-2 cursor-pointer rounded-full bg-black/50 p-2 text-white hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Next image"
        >
          <ChevronRight class="h-6 w-6" />
        </button>
      </div>

      <div class="mt-3 flex justify-center gap-2">
        {#each images as img, i (img.id)}
          <button
            type="button"
            onclick={() => {
              currentIndex = i;
            }}
            class="h-12 w-12 cursor-pointer overflow-hidden rounded border-2 {currentIndex === i
              ? 'border-white'
              : 'border-transparent opacity-60 hover:opacity-100'}"
            aria-label="View image {String(i + 1)}"
          >
            <img
              src={img.src}
              alt=""
              class="h-full w-full object-cover"
            />
          </button>
        {/each}
      </div>
    {/if}

    <p class="mt-2 text-center text-sm text-gray-300">
      {currentIndex + 1} / {images.length} — {title}
    </p>
  </div>
</div>
