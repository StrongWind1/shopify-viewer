# shopify-viewer Constitution

Project principles, coding standards, and quality gates. This document is the single source of truth for how code is written, formatted, and shipped in this repository.

## Principles

1. **Zero trust of external data.** Every field from the Shopify API is validated before use. Prices are parsed, not assumed numeric. Null checks on every nullable field. Type guards on API responses. The API has no versioned contract -- any field can change or disappear.

2. **No innerHTML, no eval, no dynamic script injection.** All user-visible text is set via `textContent` or Svelte's `{expression}` syntax (which auto-escapes). The only exception is `body_html` from the product description, which must be sanitized with DOMPurify before rendering (or displayed as plain text).

3. **Progressive enhancement.** The app works with JavaScript enabled (required for Svelte). Within that constraint, degrade gracefully: no images? Show text. Proxy down? Show a clear error. localStorage blocked? Skip history. Dark mode unsupported? Light mode works.

4. **Minimal dependencies.** Every npm package must justify its existence. Prefer platform APIs (`fetch`, `URL`, `Intl`, `structuredClone`, `IndexedDB`) over polyfill libraries. Review every transitive dependency added.

5. **Strict everywhere.** TypeScript `strict: true`. ESLint with no warnings tolerated. Prettier enforced in CI. svelte-check with zero errors. No `any` types except at the API boundary where external data enters (and even there, validate immediately into typed structures).

## Language and Framework

| Aspect          | Standard                                          |
| --------------- | ------------------------------------------------- |
| Language        | TypeScript (strict mode)                          |
| Framework       | Svelte 5 (runes: `$state`, `$derived`, `$effect`) |
| CSS             | Tailwind CSS v4 (via `@tailwindcss/vite` plugin)  |
| Build           | Vite                                              |
| Node.js         | LTS (>=22)                                        |
| Package manager | pnpm (strict, lockfile committed)                 |
| Icons           | `@lucide/svelte` (tree-shakeable)                 |
| Unit tests      | Vitest                                            |
| E2E tests       | Playwright                                        |

## TypeScript

- `strict: true` in `tsconfig.json` -- all strict checks enabled.
- No `any` in application code. Use `unknown` at API boundaries and narrow with type guards.
- No `as` type assertions except where the type system cannot express a valid narrowing (document why in a comment).
- No `!` non-null assertions. Handle null/undefined explicitly.
- No `@ts-ignore` or `@ts-expect-error` in application code.
- Interfaces for API response shapes. Types for application-internal structures.
- Enum-like constants as `as const` objects, not TypeScript enums.

## File and Naming Conventions

| Item                  | Convention              | Example                                                         |
| --------------------- | ----------------------- | --------------------------------------------------------------- |
| Svelte components     | PascalCase `.svelte`    | `ProductList.svelte`                                            |
| TypeScript modules    | kebab-case `.ts`        | `price-utils.ts`                                                |
| Type definition files | kebab-case `.ts`        | `shopify-types.ts`                                              |
| CSS files             | kebab-case `.css`       | `app.css`                                                       |
| Constants             | UPPER_SNAKE_CASE        | `MAX_RECENT_STORES`                                             |
| Functions             | camelCase               | `computeSummaries()`                                            |
| Svelte props          | camelCase               | `storeUrl`, `isLoading`                                         |
| CSS classes           | Tailwind utilities only | No custom class names unless extracted to `@apply` in `app.css` |

## Formatting -- Prettier

Prettier is the sole formatter. Configuration in `.prettierrc.json`:

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": false,
  "quoteProps": "consistent",
  "trailingComma": "all",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "proseWrap": "preserve",
  "htmlWhitespaceSensitivity": "css",
  "endOfLine": "lf",
  "singleAttributePerLine": true,
  "plugins": ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"],
  "overrides": [
    {
      "files": "*.svelte",
      "options": {
        "parser": "svelte"
      }
    }
  ]
}
```

Key choices:

- `printWidth: 100` -- wider than the strongwind.dev site (80) because TypeScript + Svelte templates are more verbose.
- `singleAttributePerLine: true` -- matches strongwind.dev.
- Svelte and Tailwind plugins for proper formatting of `.svelte` files and Tailwind class sorting.

## Linting -- ESLint

ESLint with flat config (`eslint.config.js`). Plugins:

- `@eslint/js` -- core JS rules (recommended + strict)
- `typescript-eslint` -- TS-specific rules (strict-type-checked)
- `eslint-plugin-svelte` -- Svelte rules (recommended + strict)

Key rules beyond defaults:

- `no-console`: error (use structured error handling, not console.log)
- `eqeqeq`: error (strict equality only)
- `no-var`: error (const/let only)
- `prefer-const`: error
- `@typescript-eslint/no-explicit-any`: error
- `@typescript-eslint/no-non-null-assertion`: error
- `@typescript-eslint/strict-boolean-expressions`: error

## Type Checking -- svelte-check

`svelte-check` with `tsconfig.app.json` in strict mode. Zero errors, zero warnings. Run as a CI gate.

## EditorConfig

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.{ts,js,svelte,css,html,json}]
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false

[Makefile]
indent_style = tab
```

## Cloudflare Worker

The worker in `/worker` follows the same TypeScript strictness. Additional constraints:

- No npm dependencies beyond `@cloudflare/workers-types`. The worker must be self-contained.
- All input validation happens before any upstream request.
- Domain validation: regex format check, reject private/internal IPs (10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x, localhost, IPv6).
- Response validation: check `Content-Type` includes `application/json` before forwarding.
- CORS: allow `https://strongwind.dev`, `https://www.strongwind.dev`, `https://strongwind1.github.io`, and `http://localhost:*`. Return `403` for all other origins.
- Cache upstream responses via Cloudflare Cache API with 5-minute TTL.
- Log nothing that contains user data or store data. Log only request counts and error codes.

## Security

### Content Security Policy

The `index.html` includes a CSP meta tag:

```
default-src 'none';
base-uri 'self';
form-action 'none';
object-src 'none';
frame-src 'none';
img-src 'self' https://cdn.shopify.com;
style-src 'self' 'unsafe-inline';
script-src 'self';
connect-src 'self' https://shopify-viewer-proxy.strongwind.workers.dev;
font-src 'self';
manifest-src 'self'
```

- `img-src` allows `cdn.shopify.com` for product images.
- `connect-src` allows `shopify-viewer-proxy.strongwind.workers.dev` (the Cloudflare Worker) for API calls.
- `style-src 'unsafe-inline'` is required because Tailwind may inject inline styles at runtime.

### Additional Security Headers

- **Referrer policy:** `<meta name="referrer" content="no-referrer">` prevents leaking referrer information.
- **Noscript fallback:** `<noscript>` block with a message that JavaScript is required.
- **Color scheme:** `<meta name="color-scheme" content="light dark">` for native OS integration.

### Input Handling

- Store URL input: normalized via `normalizeDomain()` which strips protocols, paths, and validates against domain regex `^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$`. Reject everything else.
- No user input is ever interpolated into HTML. Svelte's template syntax handles escaping.
- Product `body_html` is the only field containing HTML. If rendered as HTML, sanitize with DOMPurify. Prefer rendering as plain text (strip tags) unless the user explicitly requests HTML rendering.

### Dependencies

- Audit with `pnpm audit` in CI. Fail on high/critical vulnerabilities.
- Pin exact versions in `pnpm-lock.yaml`.
- Review new dependencies before adding. Prefer zero-dependency solutions.
- Dependabot enabled for npm (covers pnpm lockfiles) and GitHub Actions ecosystems.

## CI/CD -- GitHub Actions

### Workflows

| Workflow            | Trigger                             | Jobs                                                      |
| ------------------- | ----------------------------------- | --------------------------------------------------------- |
| `ci.yml`            | push to main, PRs, manual           | lint, typecheck, build, deploy (deploy only on main push) |
| `worker-deploy.yml` | push to main (changes in `/worker`) | Deploy Cloudflare Worker via wrangler                     |
| `codeql.yml`        | push to main, PRs, weekly schedule  | CodeQL analysis (javascript-typescript, actions)          |

### CI Job: lint

1. Prettier check (`pnpm exec prettier --check .`)
2. ESLint (`pnpm exec eslint .`)

### CI Job: typecheck

1. svelte-check (`pnpm exec svelte-check --tsconfig ./tsconfig.app.json`)
2. Worker typecheck (`pnpm exec tsc --noEmit` in `/worker`)

### CI Job: build

1. Frontend build (`pnpm build` in `/frontend`)
2. Upload build artifact via `actions/upload-pages-artifact`

Build depends on lint and typecheck passing (`needs: [lint, typecheck]`).

### CI Job: deploy

1. Deploy to GitHub Pages via `actions/deploy-pages`
2. Only runs on push to main (`if: github.event_name == 'push' && github.ref == 'refs/heads/main'`)
3. Requires `pages: write` and `id-token: write` permissions

### Action Pinning

All actions pinned by full commit SHA, never by tag:

```yaml
- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
- uses: pnpm/action-setup@fc06bc1257f339d1d5d8b3a19a8cae5388b55320 # v4.4.0
- uses: actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38 # v6.5.0
- uses: actions/upload-pages-artifact@56afc609e74202658d3ffba0e8f6dda462b719fa # v3.0.1
- uses: actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e # v4.0.5
```

### Workflow Standards

- `persist-credentials: false` on every checkout.
- `set -euo pipefail` at the top of every `run:` block.
- `timeout-minutes: 10` on every job.
- `concurrency` with `cancel-in-progress` for PRs.
- `permissions` scoped to minimum required per job (default: `contents: read`).
- `pnpm install --frozen-lockfile` for dependency installation.
- `pnpm/action-setup` (SHA-pinned) to install pnpm in CI.
- pnpm cache via `setup-node` with `cache-dependency-path` pointing to both `frontend/pnpm-lock.yaml` and `worker/pnpm-lock.yaml`.

## Testing

### Unit Tests -- Vitest

Vitest for all pure function tests. Directory: `frontend/tests/unit/`.

Test files:

- `url-normalization.test.ts` -- test all accepted/rejected inputs from SPEC.md
- `price-utils.test.ts` -- test price parsing and formatting
- `data-transforms.test.ts` -- test Product -> ProductSummary, Product -> ProductListRow, CategoryGroup, PriceAnalysis
- `csv-export.test.ts` -- test RFC 4180 compliance, BOM, quoting, CRLF
- `image-utils.test.ts` -- test CDN thumbnail URL transformation

Rules:

- No `any` in tests (same strictness as application code)
- No mocking of pure functions -- test with real data
- Use snapshot testing sparingly -- only for CSV output format validation
- Test files named `*.test.ts`, located in `tests/unit/` (not next to source)

### End-to-End Tests -- Playwright

Playwright for browser-level integration tests. Directory: `frontend/tests/e2e/`.

Single test file `app.spec.ts` with 6 tests:

1. App shell loads (title, input, button visible)
2. Invalid URL shows error message
3. Theme toggle switches between light and dark and back
4. Full fetch flow: enter store URL -> products load -> all 8 tabs work -> search/category/stock filters work
5. URL params trigger auto-fetch (`?store=lttstore.com&view=cards`)
6. Static assets served (favicon.svg, manifest.json)

Configuration:

- Tests run against `vite preview` server on port 4173 (production build)
- 60-second timeout per test (some stores have many products)
- 1 retry on failure
- Headless Chromium
- Screenshots on failure only
- Use `lttstore.com` as the test store

### CI Integration

Tests are run locally via `make test` (which runs `make test-unit` and `make test-e2e`). The CI pipeline currently runs lint, typecheck, and build but does not run tests in CI (e2e tests require network access to live Shopify stores).

## Git

- **Conventional commits:** `feat:`, `fix:`, `refactor:`, `docs:`, `ci:`, `chore:`, `style:`, `perf:`
- **No emoji** in commit messages or PR descriptions.
- **Imperative mood:** "add product list view", not "added product list view".
- **Signed commits** required on main (enforce via branch protection).
- **No force pushes** to main.

## Makefile

Standard targets:

```makefile
.PHONY: help install dev build lint format typecheck test test-unit test-e2e check clean deploy-worker

help:            ## Show this help
install:         ## Install all dependencies (frontend + worker)
dev:             ## Start Vite dev server (frontend)
build:           ## Production build (frontend + worker dry-run)
lint:            ## Run Prettier check + ESLint
format:          ## Run Prettier write + ESLint fix
typecheck:       ## Run svelte-check + tsc (worker)
test:            ## Run all tests (test-unit + test-e2e)
test-unit:       ## Run Vitest unit tests
test-e2e:        ## Run Playwright e2e tests
check:           ## Full CI gate: lint + typecheck + test + build
clean:           ## Remove build artifacts
deploy-worker:   ## Deploy Cloudflare Worker (requires wrangler auth)
```

`make check` is the gate command -- it must pass before any merge to main.

## Documentation

- `README.md` -- project overview, quick start, architecture.
- `docs/API.md` -- Shopify endpoint reference (maintained in this repo).
- `docs/DESIGN.md` -- architecture and data flow.
- `docs/CONSTITUTION.md` -- this document.
- `docs/SPEC.md` -- functional specification.
- `docs/TASKS.md` -- implementation work breakdown.
- `CHANGELOG.md` -- release history (keep-a-changelog format).
- `SECURITY.md` -- security policy and reporting.
- `LICENSE` -- Apache-2.0.
