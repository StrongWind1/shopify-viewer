import type { ProductSummary, ProductListRow } from "../types/shopify-types.js";

const BOM = "﻿";

function escapeField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function row(fields: string[]): string {
  return fields.map(escapeField).join(",");
}

export function productListToCsv(rows: ProductListRow[]): string {
  const lines = [
    BOM + row(["Category", "Product", "Option", "Price", "Original Price", "In Stock", "URL", "Weight (g)", "Created"]),
  ];

  for (const r of rows) {
    lines.push(
      row([
        r.category,
        r.title,
        r.option,
        String(r.price),
        r.originalPrice !== null ? String(r.originalPrice) : "",
        r.inStock ? "YES" : "NO",
        r.url,
        String(r.weightGrams),
        r.createdAt.slice(0, 10),
      ]),
    );
  }

  return lines.join("\r\n") + "\r\n";
}

export function productSummaryToCsv(rows: ProductSummary[]): string {
  const lines = [BOM + row(["Category", "Product", "Price", "In Stock", "URL"])];

  for (const r of rows) {
    lines.push(row([r.category, r.title, String(r.price), r.inStock ? "YES" : "NO", r.url]));
  }

  return lines.join("\r\n") + "\r\n";
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
