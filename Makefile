.PHONY: help install dev build lint format typecheck test test-unit test-e2e check clean deploy-worker

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	cd frontend && pnpm install --frozen-lockfile
	cd worker && pnpm install --frozen-lockfile

dev: ## Start Vite dev server (frontend)
	cd frontend && pnpm dev

build: ## Production build (frontend + worker dry-run)
	cd frontend && pnpm build
	cd worker && pnpm exec wrangler deploy --dry-run --outdir=dist

lint: ## Run Prettier check + ESLint
	pnpm exec prettier --check .
	cd frontend && pnpm exec eslint .

format: ## Run Prettier write + ESLint fix
	pnpm exec prettier --write .
	cd frontend && pnpm exec eslint --fix .

typecheck: ## Run svelte-check + tsc (worker)
	cd frontend && pnpm exec svelte-check --tsconfig ./tsconfig.json
	cd worker && pnpm exec tsc --noEmit

test: test-unit test-e2e ## Run all tests

test-unit: ## Run Vitest unit tests
	cd frontend && pnpm exec vitest run

test-e2e: ## Run Playwright e2e tests
	cd frontend && pnpm exec playwright test

check: lint typecheck test build ## Full CI gate (lint + typecheck + test + build)

clean: ## Remove build artifacts
	rm -rf frontend/dist frontend/.svelte-kit worker/dist
	rm -rf frontend/node_modules/.cache worker/node_modules/.cache
	rm -rf test-results playwright-report

deploy-worker: ## Deploy Cloudflare Worker (requires wrangler auth)
	cd worker && pnpm exec wrangler deploy
