<script lang="ts">
  import "./app.css";
  import Header from "./lib/components/Header.svelte";
  import Footer from "./lib/components/Footer.svelte";
  import StoreInput from "./lib/components/StoreInput.svelte";
  import ProgressBar from "./lib/components/ProgressBar.svelte";
  import ViewTabs from "./lib/components/ViewTabs.svelte";
  import ProductSummary from "./lib/components/views/ProductSummary.svelte";
  import ProductList from "./lib/components/views/ProductList.svelte";
  import CardGrid from "./lib/components/views/CardGrid.svelte";
  import CategoryBreakdown from "./lib/components/views/CategoryBreakdown.svelte";
  import PriceAnalysisView from "./lib/components/views/PriceAnalysis.svelte";
  import ExportPanel from "./lib/components/views/ExportPanel.svelte";
  import { store } from "./lib/stores/app-store.svelte.js";
  import {
    validateStoreInput,
    fetchMeta,
    fetchAllProducts,
    ShopifyError,
  } from "./lib/api/client.js";

  let inputValue = $state("");
  let errorMessage = $state<string | null>(null);
  let abortController: AbortController | null = null;

  const isLoading = $derived(
    store.appState.status === "fetching_meta" || store.appState.status === "fetching_products",
  );
  const hasProducts = $derived(store.products.length > 0);

  async function handleFetch(url: string) {
    if (abortController !== null) {
      abortController.abort();
    }
    abortController = new AbortController();
    const signal = abortController.signal;

    errorMessage = null;
    store.reset();
    store.setProducts([]);

    let domain: string;
    try {
      domain = validateStoreInput(url);
    } catch (err) {
      if (err instanceof ShopifyError) {
        errorMessage = err.message;
        store.setAppState({
          status: "error",
          code: err.code,
          message: err.message,
          partialProducts: 0,
        });
      }
      return;
    }

    store.setDomain(domain);
    store.setAppState({ status: "fetching_meta" });

    try {
      const meta = await fetchMeta(domain, signal);
      store.setMeta(meta);

      store.setAppState({
        status: "fetching_products",
        progress: { current: 0, total: meta.published_products_count },
      });

      const products = await fetchAllProducts(
        domain,
        (current) => {
          store.setAppState({
            status: "fetching_products",
            progress: { current, total: meta.published_products_count },
          });
        },
        signal,
      );

      store.setProducts(products);

      if (products.length === 0) {
        errorMessage = "This store has no published products.";
        store.setAppState({
          status: "error",
          code: "EMPTY_STORE",
          message: errorMessage,
          partialProducts: 0,
        });
        return;
      }

      store.setAppState({ status: "loaded" });
      store.onFetchComplete(domain, meta.name);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message =
        err instanceof ShopifyError ? err.message : "Something went wrong. Please try again.";
      const code = err instanceof ShopifyError ? err.code : ("UNKNOWN_ERROR" as const);
      errorMessage = message;
      store.setAppState({ status: "error", code, message, partialProducts: store.products.length });
    }
  }

  $effect(() => {
    const params = store.readUrlParams();
    if (params.view !== null) {
      store.setActiveView(params.view);
    }
    if (params.store !== null) {
      inputValue = params.store;
      void handleFetch(params.store);
    }
  });
</script>

<div
  class="flex min-h-screen flex-col bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-200"
>
  <Header />

  <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
    <div class="flex flex-col items-center gap-6">
      <StoreInput
        bind:value={inputValue}
        disabled={isLoading}
        error={errorMessage}
        recentStores={store.getRecentStores()}
        onsubmit={handleFetch}
        onclear={() => {
          store.clearRecentStores();
        }}
      />

      {#if store.appState.status === "fetching_meta"}
        <p class="text-sm text-gray-500 dark:text-gray-400">Connecting to {store.domain}...</p>
      {/if}

      {#if store.appState.status === "fetching_products"}
        <div class="w-full max-w-2xl">
          <ProgressBar
            current={store.appState.progress.current}
            total={store.appState.progress.total}
          />
        </div>
      {/if}

      {#if hasProducts}
        <div class="w-full">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold">
              {store.meta?.name ?? store.domain}
              <span class="text-sm font-normal text-gray-500 dark:text-gray-400">
                — {store.products.length} products
              </span>
            </h2>
          </div>

          <ViewTabs
            active={store.activeView}
            disabled={isLoading}
            onselect={(v) => {
              store.setActiveView(v);
            }}
          />

          <div class="mt-4">
            {#if store.activeView === "summary"}
              <ProductSummary
                data={store.productSummaries}
                currency={store.meta?.currency}
              />
            {:else if store.activeView === "products"}
              <ProductList
                data={store.productListRows}
                currency={store.meta?.currency}
              />
            {:else if store.activeView === "cards"}
              <CardGrid
                products={store.products}
                domain={store.domain}
                currency={store.meta?.currency}
              />
            {:else if store.activeView === "categories"}
              <CategoryBreakdown
                groups={store.categoryGroups}
                currency={store.meta?.currency}
              />
            {:else if store.activeView === "analysis"}
              {#if store.priceAnalysis !== null}
                <PriceAnalysisView
                  data={store.priceAnalysis}
                  currency={store.meta?.currency}
                />
              {/if}
            {:else if store.activeView === "export"}
              <ExportPanel
                products={store.products}
                summaries={store.productSummaries}
                listRows={store.productListRows}
                domain={store.domain}
              />
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </main>

  <Footer fetchedAt={store.fetchedAt} />
</div>
