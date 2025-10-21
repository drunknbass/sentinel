# Sentinel

Next.js app to visualize live incidents on an interactive map.

## Requirements
- Node.js 20+
- pnpm 9+
- Mapbox public token (URL‑restricted): set `NEXT_PUBLIC_MAPBOX_TOKEN`

## Setup
1) Install
```bash
pnpm install
```

2) Configure env
Create `.env.local`:
```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk_...
```

Optional (improves accuracy/perf but not required to run):
```bash
# Apple MapKit (server) – used first; falls back to free geocoders if absent
APPLE_MAPKIT_TEAM_ID=...
APPLE_MAPKIT_KEY_ID=...
APPLE_MAPKIT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Shared cache (Upstash/Vercel KV)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

## Run
Dev server:
```bash
pnpm dev
```

Build + start:
```bash
pnpm build
pnpm start
```

## Tests
Unit tests:
```bash
pnpm test
```

Optional integration (live network):
```bash
RUN_LIVE_GEOCODE_TESTS=1 pnpm vitest run tests/integration/geocode-live.test.ts
```

## Deploy
Works on any Node host. Vercel recommended. Set env vars in Production, Preview, Development. Restrict Mapbox token by URL and keep only STYLES:TILES, STYLES:READ, FONTS:READ.

## License
MIT – see `LICENSE`.

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, checks, and PR flow.
