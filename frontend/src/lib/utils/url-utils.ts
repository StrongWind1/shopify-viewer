const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

export function normalizeDomain(input: string): string | null {
  let value = input.trim().toLowerCase();

  if (value.length === 0) {
    return null;
  }

  const productsIdx = value.indexOf("/products.json");
  if (productsIdx !== -1) {
    value = value.slice(0, productsIdx);
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const url = new URL(value);
      value = url.hostname;
    } catch {
      return null;
    }
  }

  const slashIdx = value.indexOf("/");
  if (slashIdx !== -1) {
    value = value.slice(0, slashIdx);
  }

  if (!DOMAIN_RE.test(value)) {
    return null;
  }

  return value;
}

export function isValidDomain(input: string): boolean {
  return normalizeDomain(input) !== null;
}
