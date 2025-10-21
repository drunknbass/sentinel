# Contributing to Sentinel

Thanks for your interest in contributing! This doc covers setup, checks, and PR flow.

## Setup
- Node.js 20+
- pnpm 9+ (run `corepack enable`)
- Install deps: `pnpm install`

## Common Tasks
- Dev server: `pnpm dev`
- Type check: `pnpm typecheck`
- Lint: `pnpm exec next lint`
- Tests (unit): `pnpm test`
- Optional live test: `RUN_LIVE_GEOCODE_TESTS=1 pnpm vitest run tests/integration/geocode-live.test.ts`

## Pull Requests
- Target `main`
- Keep PRs focused and include tests for behavior changes
- Never commit secrets; use env vars only
- CI must pass (typecheck, lint, unit tests, build)

## Security
Secret Scanning + Push Protection are enabled. If blocked, remove the secret, rotate it, and push again.

See `.github/CODEOWNERS` for review ownership.
