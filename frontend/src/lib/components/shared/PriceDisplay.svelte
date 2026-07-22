<script lang="ts">
  import { formatPrice } from "../../utils/price-utils.js";

  interface Props {
    price: number;
    originalPrice?: number | null | undefined;
    currency?: string | undefined;
  }

  const { price, originalPrice = null, currency = undefined }: Props = $props();
</script>

<span class="inline-flex items-center gap-1.5">
  <span class="font-semibold">{formatPrice(price, currency)}</span>
  {#if originalPrice !== null && originalPrice !== undefined && originalPrice > price}
    <span class="text-sm text-gray-400 line-through">{formatPrice(originalPrice, currency)}</span>
  {/if}
</span>
