const CDN_PATTERN = /^https:\/\/cdn\.shopify\.com\//;

export function thumbnailUrl(src: string, size: number = 400): string {
  if (!CDN_PATTERN.test(src)) {
    return src;
  }

  const queryIdx = src.indexOf("?");
  const base = queryIdx !== -1 ? src.slice(0, queryIdx) : src;
  const query = queryIdx !== -1 ? src.slice(queryIdx) : "";

  const dotIdx = base.lastIndexOf(".");
  if (dotIdx === -1) {
    return src;
  }

  return `${base.slice(0, dotIdx)}_${String(size)}x${String(size)}${base.slice(dotIdx)}${query}`;
}

export function productImageSrc(
  images: { src: string; alt: string | null }[],
  featuredImage: { src: string; alt: string | null } | null,
): { src: string; alt: string } | null {
  if (images.length > 0 && images[0] !== undefined) {
    return { src: images[0].src, alt: images[0].alt ?? "" };
  }
  if (featuredImage !== null) {
    return { src: featuredImage.src, alt: featuredImage.alt ?? "" };
  }
  return null;
}
