<script lang="ts">
  import { Sun, Moon } from "@lucide/svelte";

  let dark = $state(false);

  function initTheme() {
    const stored = (() => {
      try {
        return localStorage.getItem("shopify-viewer-theme");
      } catch {
        return null;
      }
    })();
    if (stored !== null) {
      dark = stored === "dark";
    } else {
      dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    applyTheme();
  }

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  function toggleTheme() {
    dark = !dark;
    applyTheme();
    try {
      localStorage.setItem("shopify-viewer-theme", dark ? "dark" : "light");
    } catch {
      /* noop */
    }
  }

  $effect(() => {
    initTheme();
  });
</script>

<header
  class="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6 dark:border-gray-700"
>
  <a
    href="./"
    class="text-lg font-bold text-slate-800 no-underline hover:text-blue-600 sm:text-xl dark:text-slate-200 dark:hover:text-blue-400"
  >
    Shopify Viewer
  </a>

  <div class="flex items-center gap-2">
    <button
      type="button"
      onclick={toggleTheme}
      class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={dark}
    >
      {#if dark}
        <Sun class="h-5 w-5" />
      {:else}
        <Moon class="h-5 w-5" />
      {/if}
    </button>

    <a
      href="https://github.com/StrongWind1/shopify-viewer"
      target="_blank"
      rel="noopener"
      class="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      aria-label="View source on GitHub"
    >
      <svg
        class="h-5 w-5"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
        />
      </svg>
    </a>
  </div>
</header>
