/** CORS proxy for Shopify storefront JSON endpoints. */

// --- Types ---

type ErrorCode =
  | "INVALID_STORE"
  | "MISSING_STORE"
  | "UPSTREAM_ERROR"
  | "NOT_SHOPIFY"
  | "NOT_FOUND";

interface ApiRoute {
  /** Shopify storefront JSON path (e.g., /products.json). */
  upstream: string;
  /** Query params to forward from the client request. */
  forwardParams: readonly string[];
}

// --- Constants ---

const DOMAIN_RE =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

const CACHE_TTL_SECONDS = 300;

const API_ROUTES: Record<string, ApiRoute> = {
  "/api/products": { upstream: "/products.json", forwardParams: ["page", "limit"] },
  "/api/meta": { upstream: "/meta.json", forwardParams: [] },
  "/api/collections": { upstream: "/collections.json", forwardParams: [] },
};

// --- CORS ---

function isAllowedOrigin(origin: string): boolean {
  if (origin === "https://strongwind1.github.io") return true;
  return /^http:\/\/localhost(:\d+)?$/.test(origin);
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

// --- Domain Validation ---

function isPrivateHost(host: string): boolean {
  if (host === "localhost" || host.endsWith(".localhost")) return true;

  // IPv4 private/reserved ranges
  const parts = host.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p))) {
    const first = parseInt(parts[0] ?? "0", 10);
    const second = parseInt(parts[1] ?? "0", 10);
    if (first === 0 || first === 127) return true;
    if (first === 10) return true;
    if (first === 172 && second >= 16 && second <= 31) return true;
    if (first === 192 && second === 168) return true;
    if (first === 169 && second === 254) return true;
  }

  // Reject anything that looks like IPv6
  if (host.startsWith("[") || host.includes("::")) return true;

  return false;
}

function validateDomain(raw: string): string | null {
  const domain = raw.toLowerCase().trim();
  if (!DOMAIN_RE.test(domain)) return null;
  if (isPrivateHost(domain)) return null;
  return domain;
}

// --- Upstream Fetching ---

function wwwAlternative(domain: string): string {
  return domain.startsWith("www.") ? domain.slice(4) : `www.${domain}`;
}

async function fetchUpstream(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "shopify-viewer-proxy/1.0",
    },
    redirect: "follow",
  });
}

/** Fetch from the given domain; on failure, retry with www toggled. */
async function fetchWithFallback(domain: string, path: string): Promise<Response> {
  try {
    const resp = await fetchUpstream(`https://${domain}${path}`);
    if (resp.ok) return resp;
  } catch {
    // Primary network error, fall through to alternative
  }

  try {
    return await fetchUpstream(`https://${wwwAlternative(domain)}${path}`);
  } catch {
    throw new Error(`Unreachable: ${domain}`);
  }
}

// --- Response Helpers ---

function jsonResponse(body: string, status: number, origin: string | null): Response {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (origin) Object.assign(headers, corsHeaders(origin));
  return new Response(body, { status, headers });
}

function errorResponse(
  message: string,
  code: ErrorCode,
  status: number,
  origin: string | null,
): Response {
  return jsonResponse(JSON.stringify({ error: message, code }), status, origin);
}

// --- Handler ---

export default {
  async fetch(request: Request, _env: unknown, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Resolve CORS origin (null when no Origin header is present)
    const originHeader = request.headers.get("Origin");
    let allowedOrigin: string | null = null;

    if (originHeader !== null) {
      if (!isAllowedOrigin(originHeader)) {
        return errorResponse("Forbidden", "NOT_FOUND", 403, null);
      }
      allowedOrigin = originHeader;
    }

    // Preflight
    if (request.method === "OPTIONS" && allowedOrigin !== null) {
      return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
    }

    // Health check
    if (url.pathname === "/health") {
      return jsonResponse(JSON.stringify({ ok: true }), 200, allowedOrigin);
    }

    // Match API route
    const route = API_ROUTES[url.pathname];
    if (route === undefined) {
      return errorResponse("Not found", "NOT_FOUND", 404, allowedOrigin);
    }

    if (request.method !== "GET") {
      return errorResponse("Method not allowed", "NOT_FOUND", 405, allowedOrigin);
    }

    // Validate store param
    const storeRaw = url.searchParams.get("store");
    if (storeRaw === null || storeRaw === "") {
      return errorResponse("Missing store parameter", "MISSING_STORE", 400, allowedOrigin);
    }

    const domain = validateDomain(storeRaw);
    if (domain === null) {
      return errorResponse("Invalid store domain", "INVALID_STORE", 400, allowedOrigin);
    }

    // Build upstream path, forwarding only allowed query params
    const upstreamParams = new URLSearchParams();
    for (const key of route.forwardParams) {
      const val = url.searchParams.get(key);
      if (val !== null) upstreamParams.set(key, val);
    }
    const qs = upstreamParams.toString();
    const upstreamPath = qs ? `${route.upstream}?${qs}` : route.upstream;

    // Cache lookup (keyed by domain + endpoint + params, origin-independent)
    const cacheKey = new Request(`https://shopify-proxy-cache/${domain}${upstreamPath}`);
    const cache = caches.default;
    const cached = await cache.match(cacheKey);

    if (cached) {
      const body = await cached.text();
      return jsonResponse(body, 200, allowedOrigin);
    }

    // Fetch upstream with www fallback
    let upstream: Response;
    try {
      upstream = await fetchWithFallback(domain, upstreamPath);
    } catch {
      return errorResponse("Failed to reach store", "UPSTREAM_ERROR", 502, allowedOrigin);
    }

    if (!upstream.ok) {
      return errorResponse(
        `Upstream returned ${String(upstream.status)}`,
        "UPSTREAM_ERROR",
        502,
        allowedOrigin,
      );
    }

    // Validate that the response is actually JSON (Shopify check)
    const ct = upstream.headers.get("Content-Type") ?? "";
    if (!ct.includes("application/json")) {
      return errorResponse(
        "Response is not JSON — not a Shopify store",
        "NOT_SHOPIFY",
        502,
        allowedOrigin,
      );
    }

    const body = await upstream.text();

    // Store in edge cache (non-blocking via waitUntil)
    const toCache = new Response(body, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${String(CACHE_TTL_SECONDS)}`,
      },
    });
    ctx.waitUntil(cache.put(cacheKey, toCache));

    return jsonResponse(body, 200, allowedOrigin);
  },
} satisfies ExportedHandler;
