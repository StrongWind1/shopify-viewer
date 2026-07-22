import { describe, it, expect } from "vitest";
import { productListToCsv, productSummaryToCsv } from "../../src/lib/utils/csv-export.js";
import type { ProductListRow, ProductSummary } from "../../src/lib/types/shopify-types.js";

describe("productListToCsv", () => {
  const row: ProductListRow = {
    productId: 1,
    variantId: 100,
    category: "Clothing",
    title: "Test Shirt",
    option: "Large",
    price: 29.99,
    originalPrice: 39.99,
    inStock: true,
    url: "https://store.com/products/test-shirt?variant=100",
    weightGrams: 200,
    createdAt: "2024-01-15T10:00:00-05:00",
  };

  it("starts with BOM", () => {
    const csv = productListToCsv([row]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("has correct header row", () => {
    const csv = productListToCsv([row]);
    const firstLine = csv.split("\r\n")[0] ?? "";
    expect(firstLine).toContain("Category,Product,Option,Price,Original Price,In Stock,URL,Weight (g),Created");
  });

  it("uses CRLF line endings", () => {
    const csv = productListToCsv([row]);
    expect(csv).toContain("\r\n");
    expect(csv).not.toMatch(/[^\r]\n/);
  });

  it("formats data correctly", () => {
    const csv = productListToCsv([row]);
    const lines = csv.split("\r\n");
    const dataLine = lines[1] ?? "";
    expect(dataLine).toContain("Clothing");
    expect(dataLine).toContain("Test Shirt");
    expect(dataLine).toContain("YES");
    expect(dataLine).toContain("2024-01-15");
  });

  it("escapes commas in fields", () => {
    const rowWithComma: ProductListRow = { ...row, title: "Shirt, Blue" };
    const csv = productListToCsv([rowWithComma]);
    expect(csv).toContain('"Shirt, Blue"');
  });

  it("shows NO for out-of-stock", () => {
    const outOfStock: ProductListRow = { ...row, inStock: false };
    const csv = productListToCsv([outOfStock]);
    expect(csv).toContain("NO");
  });
});

describe("productSummaryToCsv", () => {
  const summary: ProductSummary = {
    id: 1,
    category: "Clothing",
    title: "Test Shirt",
    price: 29.99,
    inStock: true,
    url: "https://store.com/products/test-shirt",
    handle: "test-shirt",
  };

  it("has correct header", () => {
    const csv = productSummaryToCsv([summary]);
    expect(csv).toContain("Category,Product,Price,In Stock,URL");
  });

  it("includes BOM and CRLF", () => {
    const csv = productSummaryToCsv([summary]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("\r\n");
  });
});
