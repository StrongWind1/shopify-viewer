import { describe, it, expect } from "vitest";
import { parsePrice, computeDiscount, median, formatPrice } from "../../src/lib/utils/price-utils.js";

describe("parsePrice", () => {
  it("parses a decimal string", () => {
    expect(parsePrice("34.99")).toBe(34.99);
  });

  it("parses an integer string", () => {
    expect(parsePrice("100")).toBe(100);
  });

  it("returns 0 for invalid input", () => {
    expect(parsePrice("abc")).toBe(0);
  });

  it("returns 0 for empty string", () => {
    expect(parsePrice("")).toBe(0);
  });

  it("parses zero", () => {
    expect(parsePrice("0.00")).toBe(0);
  });
});

describe("computeDiscount", () => {
  it("computes correct percentage", () => {
    expect(computeDiscount(100, 75)).toBe(25);
  });

  it("returns 0 when original <= current", () => {
    expect(computeDiscount(50, 75)).toBe(0);
  });

  it("returns 0 when original is 0", () => {
    expect(computeDiscount(0, 0)).toBe(0);
  });

  it("handles full discount", () => {
    expect(computeDiscount(100, 0)).toBe(100);
  });
});

describe("median", () => {
  it("returns 0 for empty array", () => {
    expect(median([])).toBe(0);
  });

  it("returns single value", () => {
    expect(median([42])).toBe(42);
  });

  it("returns middle for odd count", () => {
    expect(median([1, 3, 5])).toBe(3);
  });

  it("returns average of middle two for even count", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("sorts before computing", () => {
    expect(median([5, 1, 3])).toBe(3);
  });
});

describe("formatPrice", () => {
  it("formats USD", () => {
    const result = formatPrice(34.99, "USD");
    expect(result).toContain("34.99");
  });

  it("falls back to USD for invalid currency", () => {
    const result = formatPrice(10, "INVALID");
    expect(result).toContain("10");
  });
});
