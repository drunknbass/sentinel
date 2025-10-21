# Vercel KV Setup for Edge Geocoding Cache

This guide will help you set up Vercel KV to massively speed up geocoding by caching results at the edge.

## Why Vercel KV?

**Problem**: Geocoding 200 addresses takes 200-400 seconds (1-2 seconds per address).

**Solution**: Cache geocoded results in Vercel KV (Redis at the edge).

**Benefits**:
- ⚡ **Fast**: < 10ms response time from edge
- 🌍 **Global**: Replicated to all Vercel edge regions
- 💰 **Free**: Stays within Vercel's free tier limits
- 🔄 **Persistent**: Cache survives deployments
- 🤝 **Shared**: All instances share the same cache

## Free Tier Limits

Vercel KV Free Tier (as of 2024):
- ✅ 256 MB storage (enough for ~2.5 million addresses)
- ✅ 100,000 reads/month
- ✅ 1,000 writes/month
- ✅ 30-day data retention

For this app (200 unique addresses, updating daily):
- Writes: ~200/month (one per unique address)
- Reads: Depends on traffic
- **Estimated cost: $0/month** ✨

## Setup Instructions

### 1. Deploy to Vercel (if not already deployed)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### 2. Create Vercel KV Database

1. Go to your project dashboard: https://vercel.com/dashboard
2. Click on your project
3. Go to the **Storage** tab
4. Click **Create Database**
5. Select **KV** (Key-Value Store)
6. Name it: `sentinel-geocode-cache`
7. Click **Create**

### 3. Connect KV to Your Project

Vercel will automatically add these environment variables to your project:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`
- `KV_URL`

**No manual configuration needed!** The app will automatically detect and use Vercel KV.

### 4. Redeploy

```bash
vercel --prod
```

That's it! Your geocoding cache is now running at the edge.

## How It Works

### Multi-Tier Caching

1. **Local Memory Cache** (instant)
   - Check if address was geocoded in current session
   - TTL: 3 days

2. **Vercel KV Edge Cache** (< 10ms) ⭐ NEW
   - Check if address was geocoded by any instance
   - TTL: 30 days
   - Shared across all deployments

3. **OpenStreetMap Nominatim** (1-2 seconds)
   - Primary geocoding service
   - Free, no API key required
   - Rate limit: 1 req/second

4. **Census Bureau** (200-500ms)
   - Fallback geocoding service
   - Better for exact addresses
   - Free, no API key required

### Performance Impact

**Before Vercel KV:**
```
First visitor: 200-400 seconds (geocoding 200 addresses)
Second visitor: 200-400 seconds (cache lost, geocode again)
After deployment: 200-400 seconds (cache reset)
```

**After Vercel KV:**
```
First visitor: 200-400 seconds (initial geocoding, populates KV)
Second visitor: < 1 second (all cached in KV)
After deployment: < 1 second (KV persists)
Next 100,000 visitors: < 1 second each (KV hits)
```

## Testing Locally

To test Vercel KV locally:

1. **Pull environment variables:**
   ```bash
   vercel env pull .env.local
   ```

2. **Start dev server:**
   ```bash
   pnpm dev
   ```

3. **Watch logs for KV cache hits:**
   ```
   [GEOCODE] Vercel KV cache hit: geocode:123 MAIN ST|RIVERSIDE
   ```

## Monitoring

### View KV Usage

1. Go to: https://vercel.com/dashboard
2. Click your project
3. Go to **Storage** tab
4. Click your KV database
5. View:
   - **Keys stored**: How many addresses cached
   - **Reads**: How many cache hits
   - **Writes**: How many new addresses geocoded

### Check Logs

Watch your deployment logs for:
```
[GEOCODE] Vercel KV cache hit: geocode:...    ← Cache hit (fast!)
[GEOCODE] Cache miss, geocoding: geo:...      ← Cache miss (slow)
[GEOCODE] Saved to Vercel KV: geocode:...     ← New address cached
```

## Cost Monitoring

Set up a budget alert to stay within free tier:

1. Go to: https://vercel.com/dashboard/settings/billing
2. Click **Usage Alerts**
3. Set alert at 80% of free tier limits

## Troubleshooting

### KV Not Working?

Check if environment variables are set:

```bash
# In your deployed app
vercel env ls
```

You should see:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

### Still Slow?

Check logs for:
```
[GEOCODE] Vercel KV get error (non-fatal): ...
```

This means KV is not configured. Follow setup steps above.

### Exceeding Free Tier?

If you exceed 1,000 writes/month:
1. Check if you're geocoding the same addresses repeatedly (should be cached)
2. Increase `GEOCODE_CACHE_TTL_SECONDS` in .env (default: 3 days)
3. Consider upgrading to Vercel Pro ($20/month for 1M writes)

## Disabling Vercel KV

To disable edge caching (use only local cache):

1. Go to: https://vercel.com/dashboard
2. Click your project
3. Go to **Settings** → **Environment Variables**
4. Delete `KV_REST_API_URL` and `KV_REST_API_TOKEN`
5. Redeploy

The app will fall back to local memory cache only.

## Alternative: Run Without KV

The app works fine without Vercel KV - it just won't share cache across instances or deployments. If you're not deploying to Vercel, the HTTP-based external cache option is still available (see `workers/README.md` for Cloudflare Workers setup).
