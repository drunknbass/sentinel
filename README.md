# Sentinel – Riverside Incidents (Open Source)

A Next.js app that visualizes live incident data on an interactive map with geocoding, caching, and mobile‑friendly UI.

## Features
- Live incidents with filters and search
- Map view with clustering and mobile layout
- Geocoding with multi‑tier cache (memory + Upstash/Vercel KV)
- Tunable API edge caching and safe auto‑refresh
- TypeScript + Tailwind + Vitest

## Quick Start
```bash
pnpm install
pnpm dev
```

## Environment
Create `.env.local` with at least:
```bash
# Client token (public). Restrict by origin in Mapbox dashboard.
NEXT_PUBLIC_MAPBOX_TOKEN=pk...

# Optional tuning
NEXT_PUBLIC_AUTO_REFRESH_INTERVAL_MS=300000  # 5 minutes default
INCIDENTS_S_MAXAGE=120
INCIDENTS_STALE_WHILE_REVALIDATE=300
MAX_GEOCODE_CAP=200
GEOCODE_CONCURRENCY_CAP=5
```

Server‑side (set in your hosting provider):
```bash
APPLE_MAPKIT_TEAM_ID=...
APPLE_MAPKIT_KEY_ID=...
APPLE_MAPKIT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

## Caching & Polling
- Incidents API: edge cached (`s-maxage`/`stale-while-revalidate`) and respects `?nocache=1`.
- Polling: runs only when tab is visible AND window has focus. Default 5 minutes.

## Deploy
- Vercel recommended. Set env vars in Production, Preview, and Development.
- Mapbox token must be restricted by URL and have only: STYLES:TILES, STYLES:READ, FONTS:READ.

## License
MIT – see `LICENSE`.
