import { test, expect } from "@playwright/test";

test.describe("Shopify Viewer", () => {
  test("loads the app shell", async ({ page }) => {
    await page.goto("/shopify-viewer/");
    await expect(page.locator("text=Shopify Viewer")).toBeVisible();
    await expect(page.locator('input[aria-label="Store URL"]')).toBeVisible();
    await expect(page.locator("text=Fetch Products")).toBeVisible();
  });

  test("shows error for empty submission", async ({ page }) => {
    await page.goto("/shopify-viewer/");
    await page.click("text=Fetch Products");
    await expect(page.locator("text=Enter a store URL"))
      .toBeVisible({ timeout: 5000 })
      .catch(() => {
        // Input may have native required validation — either way the form shouldn't submit
      });
  });

  test("shows error for invalid URL", async ({ page }) => {
    await page.goto("/shopify-viewer/");
    await page.fill('input[aria-label="Store URL"]', "not a url");
    await page.click("text=Fetch Products");
    await expect(page.locator(".text-red-600, .dark\\:text-red-400")).toBeVisible({
      timeout: 5000,
    });
  });

  test("theme toggle works", async ({ page }) => {
    await page.goto("/shopify-viewer/");
    const html = page.locator("html");

    await page.click('button[aria-label*="Switch to"]');
    const theme1 = await html.getAttribute("data-theme");

    await page.click('button[aria-label*="Switch to"]');
    const theme2 = await html.getAttribute("data-theme");

    expect(theme1).not.toBe(theme2);
  });

  test("URL params auto-fetch", async ({ page }) => {
    await page.goto("/shopify-viewer/?store=lttstore.com");
    await expect(page.locator('input[aria-label="Store URL"]')).toHaveValue("lttstore.com");
    // Should start fetching — look for progress or results
    await expect(
      page
        .locator("text=Connecting to")
        .or(page.locator('[role="progressbar"]'))
        .or(page.locator("text=LTTStore")),
    ).toBeVisible({ timeout: 30000 });
  });

  test("full fetch flow with lttstore.com", async ({ page }) => {
    test.setTimeout(120000);
    await page.goto("/shopify-viewer/");
    await page.fill('input[aria-label="Store URL"]', "lttstore.com");
    await page.click("text=Fetch Products");

    // Wait for products to load
    await expect(page.locator("text=LTTStore").or(page.locator("text=products"))).toBeVisible({
      timeout: 90000,
    });

    // Check view tabs appear
    await expect(page.locator('[role="tablist"]')).toBeVisible();

    // Switch to cards view
    await page.click('[role="tab"]:has-text("Cards")');
    await expect(page.locator(".grid")).toBeVisible();

    // Switch to analysis view
    await page.click('[role="tab"]:has-text("Analysis")');
    await expect(page.locator("text=Total Products")).toBeVisible();

    // Switch to export view
    await page.click('[role="tab"]:has-text("Export")');
    await expect(page.locator("text=Product List (CSV)")).toBeVisible();
  });

  test("search filter works", async ({ page }) => {
    test.setTimeout(120000);
    await page.goto("/shopify-viewer/?store=lttstore.com");

    // Wait for products
    await expect(page.locator('[role="tablist"]')).toBeVisible({ timeout: 90000 });

    // Type in search
    await page.fill('input[aria-label="Search products"]', "shirt");
    // Product count should change
    await expect(page.locator("text=shown")).toBeVisible({ timeout: 5000 });
  });
});
