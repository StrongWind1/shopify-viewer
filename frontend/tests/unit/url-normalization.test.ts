import { describe, it, expect } from "vitest";
import { normalizeDomain, isValidDomain } from "../../src/lib/utils/url-utils.js";

describe("normalizeDomain", () => {
  it("accepts a bare domain", () => {
    expect(normalizeDomain("lttstore.com")).toBe("lttstore.com");
  });

  it("accepts a domain with www", () => {
    expect(normalizeDomain("www.lttstore.com")).toBe("www.lttstore.com");
  });

  it("strips https:// and extracts hostname", () => {
    expect(normalizeDomain("https://www.lttstore.com")).toBe("www.lttstore.com");
  });

  it("strips the products.json path", () => {
    expect(normalizeDomain("https://www.lttstore.com/products.json")).toBe("www.lttstore.com");
  });

  it("accepts myshopify.com domains", () => {
    expect(normalizeDomain("lttstore.myshopify.com")).toBe("lttstore.myshopify.com");
  });

  it("lowercases the domain", () => {
    expect(normalizeDomain("LTTSTORE.COM")).toBe("lttstore.com");
  });

  it("trims whitespace", () => {
    expect(normalizeDomain("  lttstore.com  ")).toBe("lttstore.com");
  });

  it("strips trailing path after domain", () => {
    expect(normalizeDomain("lttstore.com/collections")).toBe("lttstore.com");
  });

  it("rejects empty input", () => {
    expect(normalizeDomain("")).toBeNull();
  });

  it("rejects text without dots", () => {
    expect(normalizeDomain("not a url")).toBeNull();
  });

  it("accepts IP-like strings (proxy handles rejection)", () => {
    expect(normalizeDomain("192.168.1.1")).toBe("192.168.1.1");
  });

  it("rejects localhost", () => {
    expect(normalizeDomain("localhost")).toBeNull();
  });

  it("rejects file:// URLs", () => {
    expect(normalizeDomain("file:///etc/passwd")).toBeNull();
  });
});

describe("isValidDomain", () => {
  it("returns true for valid domains", () => {
    expect(isValidDomain("lttstore.com")).toBe(true);
  });

  it("returns false for invalid input", () => {
    expect(isValidDomain("")).toBe(false);
  });
});
