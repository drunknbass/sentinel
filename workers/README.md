# Geocoding Cache Worker

A Cloudflare Workers service that provides globally distributed, edge-cached geocoding results.

## Why Use This?

Geocoding APIs like OpenStreetMap Nominatim and Census Bureau are:
- **Slow**: 1-2 seconds per request
- **Rate-limited**: Max 1 request/second for Nominatim
- **Single-instance**: Your local cache doesn't help other instances

This worker provides:
- **Fast**: < 50ms response time from Cloudflare's edge network
- **Shared**: All your app instances share the same cache
- **Free**: Cloudflare Workers Free plan includes 100k requests/day
- **Distributed**: Automatically replicated to 300+ global locations

## Performance Impact

**Without external cache:**
- Geocoding 200 addresses: ~200-400 seconds (with 1-second rate limiting)
- Each deployment starts with empty cache
- Multiple instances duplicate work

**With external cache:**
- First request: Same as before (~200-400 seconds)
- Subsequent requests: Instant (cache hit)
- All instances share results
- Cache persists across deployments

## Setup

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Create KV Namespace

```bash
cd workers
wrangler kv:namespace create GEOCODE_CACHE
```

This will output something like:
```
{ binding = "GEOCODE_CACHE", id = "abc123..." }
```

### 4. Update wrangler.toml

Uncomment the `kv_namespaces` section in `wrangler.toml` and add your namespace ID:

```toml
kv_namespaces = [
  { binding = "GEOCODE_CACHE", id = "abc123..." }
]
```

### 5. Deploy

```bash
wrangler deploy
```

This will output your worker URL:
```
Published sentinel-geocode-cache
  https://sentinel-geocode-cache.YOUR_SUBDOMAIN.workers.dev
```

### 6. Configure Your App

Add the worker URL to your `.env` file:

```bash
GEOCODE_CACHE_URL=https://sentinel-geocode-cache.YOUR_SUBDOMAIN.workers.dev
```

## API

### GET /geocode/{key}

Retrieve a cached geocode result.

**Response:**
```json
{
  "lat": 33.7280566,
  "lon": -116.3983992,
  "approximate": false
}
```

### PUT /geocode/{key}

Store a geocode result in the cache.

**Request Body:**
```json
{
  "lat": 33.7280566,
  "lon": -116.3983992,
  "approximate": false
}
```

## Pricing

Cloudflare Workers Free plan includes:
- 100,000 requests/day
- 1 GB KV storage
- 1,000 KV writes/day
- 100,000 KV reads/day

For most use cases, this is completely free.

## Security

- Read-only access (anyone can GET cached results)
- No authentication required (geocoding is public data)
- Results expire after 30 days
- CORS enabled for browser access

## Monitoring

View your worker's usage and logs at:
https://dash.cloudflare.com/

## Alternative: Vercel Edge Config

If you're deploying on Vercel, you can use Vercel Edge Config instead:

1. Create an Edge Config: https://vercel.com/docs/storage/edge-config
2. Update `lib/geocode.ts` to use Vercel's SDK
3. Set `GEOCODE_CACHE_URL` to your Edge Config URL

## Alternative: Railway Redis

For a traditional Redis cache:

1. Deploy Redis on Railway: https://railway.app/new/template/redis
2. Set `GEOCODE_CACHE_URL` to `redis://...`
3. Update `lib/geocode.ts` to use Redis client

The current implementation is service-agnostic - as long as your cache service supports GET/PUT HTTP requests with JSON, it will work.
