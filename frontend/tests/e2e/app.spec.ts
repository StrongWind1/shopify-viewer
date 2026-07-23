import { test, expect } from "@playwright/test";

test.describe("Shopify Viewer", () => {
  test("loads the app shell", async ({ page }) => {
    await page.goto("/shopify-viewer/");
    await expect(page.getByText("Shopify Viewer")).toBeVisible();
    await expect(page.getByLabel("Store URL")).toBeVisible();
    await expect(page.getByRole("button", { name: "Fetch Products" })).toBeVisible();
  });

  test("shows error for invalid URL", async ({ page }) => {
    await page.goto("/shopify-viewer/");
    await page.getByLabel("Store URL").fill("not a url");
    await page.getByRole("button", { name: "Fetch Products" }).click();
    await expect(page.getByText("Enter a valid")).toBeVisible({ timeout: 5000 });
  });

  test("theme toggle switches between light and dark", async ({ page }) => {
    await page.goto("/shopify-viewer/");
    const html = page.locator("html");

    const initial = await html.getAttribute("data-theme");
    await page.getByLabel(/Switch to/).click();
    const toggled = await html.getAttribute("data-theme");
    expect(initial).not.toBe(toggled);

    await page.getByLabel(/Switch to/).click();
    const restored = await html.getAttribute("data-theme");
    expect(restored).toBe(initial);
  });

  test("full fetch flow with lttstore.com", async ({ page }) => {
    test.setTimeout(120_000);

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => {
      errors.push(err.message);
    });

    await page.goto("/shopify-viewer/");
    await page.getByLabel("Store URL").fill("lttstore.com");
    await page.getByRole("button", { name: "Fetch Products" }).click();

    // Should show connecting state
    await expect(page.getByText("Connecting to")).toBeVisible({ timeout: 5_000 });

    // Wait for either products to load or an error to appear
    const loaded = page.getByRole("tablist");
    const errorEl = page.locator(".text-red-600");

    await expect(loaded.or(errorEl)).toBeVisible({ timeout: 90_000 });

    if (await errorEl.isVisible()) {
      const errText = await errorEl.textContent();
      console.log("Fetch failed with error:", errText);
      console.log("Console errors:", errors);
      test.fail(true, `Fetch failed: ${errText ?? "unknown"}`);
      return;
    }

    // Products loaded — verify each view tab works
    console.log("Products loaded, testing tabs...");

    // Summary tab (default)
    await expect(page.getByRole("table")).toBeVisible({ timeout: 5_000 });

    // Products tab
    await page.getByRole("tab", { name: "Products" }).click();
    await expect(page.getByRole("table")).toBeVisible({ timeout: 5_000 });

    // Cards tab
    await page.getByRole("tab", { name: "Cards" }).click();
    await expect(page.locator(".grid")).toBeVisible({ timeout: 5_000 });

    // Categories tab
    await page.getByRole("tab", { name: "Categories" }).click();
    await expect(page.getByText("Expand All")).toBeVisible({ timeout: 5_000 });

    // Analysis tab
    await page.getByRole("tab", { name: "Analysis" }).click();
    await expect(page.getByText("Total Products")).toBeVisible({ timeout: 5_000 });

    // History tab
    await page.getByRole("tab", { name: "History" }).click();
    await expect(page.getByText("No price history").or(page.getByText("snapshot"))).toBeVisible({
      timeout: 5_000,
    });

    // Compare tab
    await page.getByRole("tab", { name: "Compare" }).click();
    await expect(page.getByText("Compare with another store")).toBeVisible({ timeout: 5_000 });

    // Export tab
    await page.getByRole("tab", { name: "Export" }).click();
    await expect(page.getByText("Product List (CSV)")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Product Summary (CSV)")).toBeVisible();
    await expect(page.getByText("Raw Data (JSON)")).toBeVisible();
    await expect(page.getByText("Summary Data (JSON)")).toBeVisible();

    // Search filter — switch back to summary
    await page.getByRole("tab", { name: "Summary" }).click();
    await page.getByLabel("Search products").fill("shirt");
    await expect(page.getByText("shown")).toBeVisible({ timeout: 5_000 });

    // Category filter
    await page.getByLabel("Search products").clear();
    const catSelect = page.getByLabel("Filter by category");
    const options = await catSelect.locator("option").allTextContents();
    if (options.length > 1) {
      await catSelect.selectOption({ index: 1 });
      await expect(page.getByText("shown")).toBeVisible({ timeout: 5_000 });
    }

    // Stock filter
    await catSelect.selectOption("All Categories");
    await page.getByLabel("Filter by stock status").selectOption("outOfStock");
    // Should show filtered count or empty state
    await page.waitForTimeout(500);

    console.log("All tabs and filters verified. Console errors:", errors);
  });

  test("URL params trigger auto-fetch", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/shopify-viewer/?store=lttstore.com&view=cards");

    // Should auto-fetch
    await expect(page.getByText("Connecting to").or(page.getByRole("tablist"))).toBeVisible({
      timeout: 90_000,
    });
  });

  test("favicon and manifest are served", async ({ page }) => {
    const favicon = await page.request.get("/shopify-viewer/favicon.svg");
    expect(favicon.status()).toBe(200);

    const manifest = await page.request.get("/shopify-viewer/manifest.json");
    expect(manifest.status()).toBe(200);
    const json = await manifest.json();
    expect(json.name).toBe("Shopify Viewer");
  });
});
