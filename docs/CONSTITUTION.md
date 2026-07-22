# shopify-viewer Constitution

Project principles, coding standards, and quality gates. This document is the single source of truth for how code is written, formatted, and shipped in this repository.

## Principles

1. **Zero trust of external data.** Every field from the Shopify API is validated before use. Prices are parsed, not assumed numeric. Null checks on every nullable field. Type guards on API responses. The API has no versioned contract — any field can change or disappear.

2. **No innerHTML, no eval, no dynamic script injection.** All user-visible text is set via `textContent` or Svelte's `{expression}` syntax (which auto-escapes). The only exception is `body_html` from the product description, which must be sanitized with DOMPurify before rendering (or displayed as plain text).

3. **Progressive enhancement.** The app works with JavaScript enabled (required for Svelte). Within that constraint, degrade gracefully: no images? Show text. Proxy down? Show a clear error. localStorage blocked? Skip history. Dark mode unsupported? Light mode works.

4. **Minimal dependencies.** Every npm package must justify its existence. Prefer platform APIs (`fetch`, `URL`, `Intl`, `structuredClone`) over polyfill libraries. Review every transitive dependency added.

5. **Strict everywhere.** TypeScript `strict: true`. ESLint with no warnings tolerated. Prettier enforced in CI. svelte-check with zero errors. No `any` types except at the API boundary where external data enters (and even there, validate immediately into typed structures).

## Language and Framework

| Aspect | Standard |
|---|---|
| Language | TypeScript (strict mode) |
| Framework | Svelte 5 (runes: `$state`, `$derived`, `$effect`) |
| CSS | Tailwind CSS |
| Build | Vite |
| Node.js | LTS (≥22) |
| Package manager | pnpm (strict, lockfile committed) |
| Icons | Lucide (`lucide-svelte` — tree-shakeable) |
| Unit tests | Vitest |
| E2E tests | Playwright |

## TypeScript

- `strict: true` in `tsconfig.json` — all strict checks enabled.
- No `any` in application code. Use `unknown` at API boundaries and narrow with type guards.
- No `as` type assertions except where the type system cannot express a valid narrowing (document why in a comment).
- No `!` non-null assertions. Handle null/undefined explicitly.
- No `@ts-ignore` or `@ts-expect-error` in application code.
- Interfaces for API response shapes. Types for application-internal structures.
- Enum-like constants as `as const` objects, not TypeScript enums.

## File and Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Svelte components | PascalCase `.svelte` | `ProductList.svelte` |
| TypeScript modules | kebab-case `.ts` | `price-utils.ts` |
| Type definition files | kebab-case `.ts` | `shopify-types.ts` |
| CSS files | kebab-case `.css` | `app.css` |
| Constants | UPPER_SNAKE_CASE | `MAX_RECENT_STORES` |
| Functions | camelCase | `computeSummaries()` |
| Svelte props | camelCase | `storeUrl`, `isLoading` |
| CSS classes | Tailwind utilities only | No custom class names unless extracted to `@apply` in `app.css` |

## Formatting — Prettier

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
- `printWidth: 100` — wider than the strongwind.dev site (80) because TypeScript + Svelte templates are more verbose.
- `singleAttributePerLine: true` — matches strongwind.dev.
- Svelte and Tailwind plugins for proper formatting of `.svelte` files and Tailwind class sorting.

## Linting — ESLint

ESLint with flat config (`eslint.config.js`). Plugins:

- `@eslint/js` — core JS rules (recommended + strict)
- `typescript-eslint` — TS-specific rules (strict-type-checked)
- `eslint-plugin-svelte` — Svelte rules (recommended + strict)
- `eslint-plugin-tailwindcss` — Tailwind class validation

Key rules beyond defaults:
- `no-console`: error (use structured error handling, not console.log)
- `eqeqeq`: error (strict equality only)
- `no-var`: error (const/let only)
- `prefer-const`: error
- `@typescript-eslint/no-explicit-any`: error
- `@typescript-eslint/no-non-null-assertion`: error
- `@typescript-eslint/strict-boolean-expressions`: error

## Type Checking — svelte-check

`svelte-check` with `tsconfig.json` in strict mode. Zero errors, zero warnings. Run as a CI gate.

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
- Domain validation: parse with `URL`, verify hostname format, reject private/internal IPs.
- Response validation: check `Content-Type` is `application/json` before forwarding.
- CORS: only allow the production GitHub Pages origin. Return `403` for all other origins.
- Log nothing that contains user data or store data. Log only request counts and error codes.

## Security

### Content Security Policy

The GitHub Pages deployment includes a CSP meta tag:

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
- `style-src 'unsafe-inline'` is required by Tailwind's runtime (if any inline styles are generated). Prefer eliminating this if possible by using only utility classes.

### Input Handling

- Store URL input: sanitize via `URL` constructor. Extract hostname. Validate against domain regex `^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$`. Reject everything else.
- No user input is ever interpolated into HTML. Svelte's template syntax handles escaping.
- Product `body_html` is the only field containing HTML. If rendered as HTML, sanitize with DOMPurify. Prefer rendering as plain text (strip tags) unless the user explicitly requests HTML rendering.

### Dependencies

- Audit with `pnpm audit` in CI. Fail on high/critical vulnerabilities.
- Pin exact versions in `pnpm-lock.yaml`.
- Review new dependencies before adding. Prefer zero-dependency solutions.
- Dependabot enabled for npm (covers pnpm lockfiles) and GitHub Actions ecosystems.

## CI/CD — GitHub Actions

### Workflows

| Workflow | Trigger | Jobs |
|---|---|---|
| `ci.yml` | push to main, PRs | lint, typecheck, test, build |
| `deploy.yml` | push to main (after CI passes) | Build frontend, deploy to GitHub Pages |
| `worker-deploy.yml` | push to main (changes in `/worker`) | Deploy Cloudflare Worker via wrangler |
| `codeql.yml` | push to main, PRs, weekly schedule | CodeQL analysis (javascript-typescript, actions) |

### CI Job: lint

1. Prettier check (`pnpm exec prettier --check .`)
2. ESLint (`pnpm exec eslint .`)

### CI Job: typecheck

1. svelte-check (`pnpm exec svelte-check --tsconfig ./frontend/tsconfig.json`)
2. Worker typecheck (`pnpm exec tsc --noEmit` in `/worker`)

### CI Job: build

1. Frontend build (`pnpm run build` in `/frontend`)
2. Worker build (`pnpm exec wrangler deploy --dry-run` in `/worker`)

### Action Pinning

All actions pinned by full commit SHA, never by tag:

```yaml
- uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0  # v7.0.0
```

### Workflow Standards

- `persist-credentials: false` on every checkout.
- `set -euo pipefail` at the top of every `run:` block.
- `timeout-minutes` on every job.
- `concurrency` with `cancel-in-progress` for PRs.
- `permissions` scoped to minimum required per job.
- `pnpm install --frozen-lockfile` for dependency installation.
- `pnpm/action-setup` (SHA-pinned) to install pnpm in CI.

## Testing

### Unit Tests — Vitest

Vitest for all pure function tests. Directory: `frontend/tests/unit/`.

Test targets:
- URL normalization (all accepted/rejected inputs from SPEC.md)
- Data transformations (Product → ProductSummary, Product → ProductListRow, etc.)
- Price parsing and formatting
- CSV generation (RFC 4180 compliance)
- Image URL transformation (CDN thumbnail suffix insertion)

Rules:
- No `any` in tests (same strictness as application code)
- No mocking of pure functions — test with real data
- Use snapshot testing sparingly — only for CSV output format validation
- Test files named `*.test.ts`, colocated in `tests/unit/` (not next to source)

### End-to-End Tests — Playwright

Playwright for browser-level integration tests. Directory: `frontend/tests/e2e/`.

Test targets:
- Full fetch flow: enter store URL → see products in all views
- Theme toggle persists across reload
- URL params trigger auto-fetch
- Export downloads produce valid files
- Error states render correctly (invalid URL, unreachable store)
- Keyboard navigation through all interactive elements

Rules:
- Tests run against the Vite dev server (not production build)
- Use a known stable Shopify store for live tests (e.g., `lttstore.com`)
- Timeout: 60 seconds per test (some stores have many products)
- Tests must work in CI (headless Chromium)

### CI Integration

Add a `test` job to `ci.yml` that runs after `lint` and `typecheck`:
1. `pnpm exec vitest run` (unit tests)
2. `pnpm exec playwright test` (e2e tests, headless)

The `build` job depends on `test` passing.

## Git

- **Conventional commits:** `feat:`, `fix:`, `refactor:`, `docs:`, `ci:`, `chore:`, `style:`, `perf:`
- **No emoji** in commit messages or PR descriptions.
- **Imperative mood:** "add product list view", not "added product list view".
- **Signed commits** required on main (enforce via branch protection).
- **No force pushes** to main.

## Makefile

Standard targets mirroring the Python/Rust projects:

```makefile
.PHONY: dev build lint format typecheck check clean install

install:        ## Install all dependencies
dev:            ## Start Vite dev server
build:          ## Production build (frontend + worker dry-run)
lint:           ## Run Prettier check + ESLint
format:         ## Run Prettier write + ESLint fix
typecheck:      ## Run svelte-check + tsc
check:          ## lint + typecheck + build (full CI gate)
clean:          ## Remove build artifacts
deploy-worker:  ## Deploy Cloudflare Worker (requires wrangler auth)
```

`make check` is the gate command — it must pass before any merge to main.

## Documentation

- `README.md` — project overview, quick start, screenshots.
- `docs/API.md` — Shopify endpoint reference (maintained in this repo).
- `docs/DESIGN.md` — architecture and data flow.
- `docs/CONSTITUTION.md` — this document.
- `docs/SPEC.md` — functional specification.
- `docs/TASKS.md` — implementation work breakdown.
- `CHANGELOG.md` — release history (keep-a-changelog format).
- `SECURITY.md` — security policy and reporting.
- `LICENSE` — Apache-2.0.
