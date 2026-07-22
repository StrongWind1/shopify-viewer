import { describe, it, expect } from "vitest";
import { thumbnailUrl, productImageSrc } from "../../src/lib/utils/image-utils.js";

describe("thumbnailUrl", () => {
  it("inserts size suffix for Shopify CDN URLs", () => {
    const src = "https://cdn.shopify.com/s/files/1/0000/0001/files/image.jpg?v=12345";
    expect(thumbnailUrl(src, 400)).toBe(
      "https://cdn.shopify.com/s/files/1/0000/0001/files/image_400x400.jpg?v=12345",
    );
  });

  it("handles URLs without query params", () => {
    const src = "https://cdn.shopify.com/s/files/1/0000/0001/files/photo.png";
    expect(thumbnailUrl(src, 200)).toBe(
      "https://cdn.shopify.com/s/files/1/0000/0001/files/photo_200x200.png",
    );
  });

  it("returns non-CDN URLs unchanged", () => {
    const src = "https://example.com/image.jpg";
    expect(thumbnailUrl(src)).toBe(src);
  });

  it("defaults to size 400", () => {
    const src = "https://cdn.shopify.com/s/files/1/test/image.webp";
    expect(thumbnailUrl(src)).toContain("_400x400");
  });
});

describe("productImageSrc", () => {
  it("returns first image from images array", () => {
    const result = productImageSrc(
      [{ src: "https://cdn.shopify.com/img1.jpg", alt: "Product" }],
      null,
    );
    expect(result).toEqual({ src: "https://cdn.shopify.com/img1.jpg", alt: "Product" });
  });

  it("falls back to featured_image", () => {
    const result = productImageSrc([], { src: "https://cdn.shopify.com/feat.jpg", alt: "Featured" });
    expect(result).toEqual({ src: "https://cdn.shopify.com/feat.jpg", alt: "Featured" });
  });

  it("returns null when no images available", () => {
    expect(productImageSrc([], null)).toBeNull();
  });

  it("replaces null alt with empty string", () => {
    const result = productImageSrc([{ src: "https://cdn.shopify.com/img.jpg", alt: null }], null);
    expect(result?.alt).toBe("");
  });
});
