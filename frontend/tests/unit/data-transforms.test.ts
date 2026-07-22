import { describe, it, expect } from "vitest";
import {
  toProductSummaries,
  toProductListRows,
  toCategoryGroups,
  toPriceAnalysis,
} from "../../src/lib/utils/data-transforms.js";
import type { ShopifyProduct } from "../../src/lib/types/shopify-types.js";

function makeProduct(overrides: Partial<ShopifyProduct> = {}): ShopifyProduct {
  return {
    id: 1,
    title: "Test Product",
    handle: "test-product",
    body_html: "<p>Description</p>",
    published_at: "2024-01-01T00:00:00-05:00",
    created_at: "2024-01-01T00:00:00-05:00",
    updated_at: "2024-01-01T00:00:00-05:00",
    vendor: "Test Vendor",
    product_type: "Clothing",
    tags: ["tag1"],
    variants: [
      {
        id: 100,
        product_id: 1,
        title: "Default Title",
        price: "29.99",
        compare_at_price: null,
        sku: "TST-001",
        position: 1,
        option1: null,
        option2: null,
        option3: null,
        grams: 200,
        requires_shipping: true,
        taxable: true,
        available: true,
        featured_image: null,
        created_at: "2024-01-01T00:00:00-05:00",
        updated_at: "2024-01-01T00:00:00-05:00",
      },
    ],
    images: [],
    options: [{ name: "Title", position: 1, values: ["Default Title"] }],
    ...overrides,
  };
}

describe("toProductSummaries", () => {
  it("converts a product to summary", () => {
    const summaries = toProductSummaries([makeProduct()], "test.com");
    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.title).toBe("Test Product");
    expect(summaries[0]?.price).toBe(29.99);
    expect(summaries[0]?.inStock).toBe(true);
    expect(summaries[0]?.url).toBe("https://test.com/products/test-product");
  });

  it("uses lowest variant price", () => {
    const product = makeProduct({
      variants: [
        { ...makeProduct().variants[0]!, price: "50.00" },
        { ...makeProduct().variants[0]!, id: 101, price: "25.00" },
      ],
    });
    const summaries = toProductSummaries([product], "test.com");
    expect(summaries[0]?.price).toBe(25);
  });

  it("labels empty product_type as Uncategorized", () => {
    const summaries = toProductSummaries([makeProduct({ product_type: "" })], "test.com");
    expect(summaries[0]?.category).toBe("Uncategorized");
  });

  it("inStock is true if any variant available", () => {
    const product = makeProduct({
      variants: [
        { ...makeProduct().variants[0]!, available: false },
        { ...makeProduct().variants[0]!, id: 101, available: true },
      ],
    });
    const summaries = toProductSummaries([product], "test.com");
    expect(summaries[0]?.inStock).toBe(true);
  });
});

describe("toProductListRows", () => {
  it("creates one row per variant", () => {
    const product = makeProduct({
      variants: [
        { ...makeProduct().variants[0]!, title: "Small" },
        { ...makeProduct().variants[0]!, id: 101, title: "Large" },
      ],
    });
    const rows = toProductListRows([product], "test.com");
    expect(rows).toHaveLength(2);
  });

  it("suppresses Default Title", () => {
    const rows = toProductListRows([makeProduct()], "test.com");
    expect(rows[0]?.option).toBe("");
  });

  it("includes variant ID in URL", () => {
    const rows = toProductListRows([makeProduct()], "test.com");
    expect(rows[0]?.url).toContain("variant=100");
  });

  it("parses compare_at_price correctly", () => {
    const product = makeProduct({
      variants: [{ ...makeProduct().variants[0]!, compare_at_price: "39.99", price: "29.99" }],
    });
    const rows = toProductListRows([product], "test.com");
    expect(rows[0]?.originalPrice).toBe(39.99);
  });

  it("sets originalPrice to null when same as price", () => {
    const product = makeProduct({
      variants: [{ ...makeProduct().variants[0]!, compare_at_price: "29.99", price: "29.99" }],
    });
    const rows = toProductListRows([product], "test.com");
    expect(rows[0]?.originalPrice).toBeNull();
  });
});

describe("toCategoryGroups", () => {
  it("groups products by category", () => {
    const products = [
      makeProduct({ id: 1, product_type: "Clothing" }),
      makeProduct({ id: 2, product_type: "Accessories" }),
      makeProduct({ id: 3, product_type: "Clothing" }),
    ];
    const summaries = toProductSummaries(products, "test.com");
    const groups = toCategoryGroups(summaries, products);
    expect(groups).toHaveLength(2);
    const clothing = groups.find((g) => g.name === "Clothing");
    expect(clothing?.productCount).toBe(2);
  });

  it("sorts by product count descending", () => {
    const products = [
      makeProduct({ id: 1, product_type: "A" }),
      makeProduct({ id: 2, product_type: "B" }),
      makeProduct({ id: 3, product_type: "B" }),
    ];
    const summaries = toProductSummaries(products, "test.com");
    const groups = toCategoryGroups(summaries, products);
    expect(groups[0]?.name).toBe("B");
  });

  it("computes in-stock rate", () => {
    const products = [
      makeProduct({
        id: 1,
        product_type: "Cat",
        variants: [{ ...makeProduct().variants[0]!, available: true }],
      }),
      makeProduct({
        id: 2,
        product_type: "Cat",
        variants: [{ ...makeProduct().variants[0]!, available: false }],
      }),
    ];
    const summaries = toProductSummaries(products, "test.com");
    const groups = toCategoryGroups(summaries, products);
    expect(groups[0]?.inStockRate).toBe(50);
  });
});

describe("toPriceAnalysis", () => {
  it("computes basic stats", () => {
    const products = [
      makeProduct({ id: 1, variants: [{ ...makeProduct().variants[0]!, price: "10.00" }] }),
      makeProduct({ id: 2, variants: [{ ...makeProduct().variants[0]!, price: "20.00" }] }),
      makeProduct({ id: 3, variants: [{ ...makeProduct().variants[0]!, price: "30.00" }] }),
    ];
    const analysis = toPriceAnalysis(products);
    expect(analysis.totalProducts).toBe(3);
    expect(analysis.totalVariants).toBe(3);
    expect(analysis.minPrice).toBe(10);
    expect(analysis.maxPrice).toBe(30);
    expect(analysis.averagePrice).toBe(20);
    expect(analysis.medianPrice).toBe(20);
  });

  it("detects sale items", () => {
    const products = [
      makeProduct({
        variants: [{ ...makeProduct().variants[0]!, price: "25.00", compare_at_price: "50.00" }],
      }),
    ];
    const analysis = toPriceAnalysis(products);
    expect(analysis.saleItems.count).toBe(1);
    expect(analysis.saleItems.averageDiscount).toBe(50);
    expect(analysis.saleItems.totalSavings).toBe(25);
  });

  it("ranks most/least expensive", () => {
    const products = Array.from({ length: 6 }, (_, i) =>
      makeProduct({
        id: i,
        title: `P${String(i)}`,
        variants: [{ ...makeProduct().variants[0]!, price: String((i + 1) * 10) }],
      }),
    );
    const analysis = toPriceAnalysis(products);
    expect(analysis.mostExpensive).toHaveLength(5);
    expect(analysis.mostExpensive[0]?.price).toBe(60);
    expect(analysis.leastExpensive[0]?.price).toBe(10);
  });
});
