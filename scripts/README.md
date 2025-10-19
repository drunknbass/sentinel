# Scripts

This folder contains optional helper scripts for maintainers.

- `examples/` – safe example scripts that exercise app logic using your local env.
- `scan-github-secrets.ts` – audits PRs/issues/comments/releases for possible secret strings.

Run examples:
```bash
pnpm tsx scripts/examples/geocode-last-50.ts
pnpm tsx scripts/examples/test-geocode.ts
```

Notes
- These scripts are not part of CI and may call external services if your env enables them.
- Keep credentials in environment variables; do not hardcode tokens in scripts.
