<script lang="ts">
  type Variant = "inStock" | "outOfStock" | "limited" | "sale";

  interface Props {
    variant: Variant;
    label: string;
  }

  const { variant, label }: Props = $props();

  const classes: Record<Variant, string> = {
    inStock: "bg-green-500 text-white",
    outOfStock: "bg-red-500 text-white",
    limited: "bg-yellow-500 text-white",
    sale: "bg-orange-500 text-white",
  };
</script>

<span
  class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium {classes[variant]}"
  aria-label={label}
>
  {label}
</span>
