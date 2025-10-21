# Security & Configuration Audit

**Date:** 2025-01-18
**Branch:** develop
**Auditor:** Claude Code

## ✅ Mapbox Token - VERIFIED

### Implementation Status
- **Client-side usage:** ✅ Properly configured
  - `components/leaflet-map.tsx:434` - Uses `NEXT_PUBLIC_MAPBOX_TOKEN`
  - `components/landing-page.tsx:19` - Uses `NEXT_PUBLIC_MAPBOX_TOKEN`
- **Fallback tile layer:** ✅ CartoDB used when token unavailable
- **Legacy API route:** ⚠️ `/api/mapbox-token/route.ts` exists but unused
  - Can be removed to simplify codebase
  - All client code uses env var directly

### Environment Configuration
```bash
# Required in .env.local and Vercel
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
```

### Security Recommendations
1. ✅ Token is public (NEXT_PUBLIC_*) - correct for client-side usage
2. ⚠️ **ACTION REQUIRED:** Restrict token in Mapbox dashboard:
   - URL restrictions: Add your production domains
   - Scopes: Keep only `STYLES:TILES`, `STYLES:READ`, `FONTS:READ`
3. 🔄 Token was recently rotated - verify deployment has new token

---

## ✅ Polling Implementation - VERIFIED

### Configuration
- **Interval:** 5 minutes (300000ms)
- **Environment variable:** `NEXT_PUBLIC_AUTO_REFRESH_INTERVAL_MS`
- **Location:** `app/page.tsx:20`

### Safety Checks
```typescript
// Triple-gated polling (app/page.tsx:1000-1007)
1. autoRefreshEnabled (user toggle)
2. isTabVisible (document.visibilitychange)
3. isWindowFocused (window focus state)
4. Double-check: document.hidden + document.hasFocus()
```

**Status:** ✅ Excellent implementation - prevents wasteful API calls

---

## ✅ API Caching - VERIFIED

### Incidents API (`/api/incidents/route.ts`)
```typescript
// Default cache (line 111-115)
s-maxage: 120 seconds (2 min)
stale-while-revalidate: 300 seconds (5 min)

// Override with ?nocache=1
Cache-Control: no-store
```

**Environment tuning:**
- `INCIDENTS_S_MAXAGE` (default: 120)
- `INCIDENTS_STALE_WHILE_REVALIDATE` (default: 300)

### Analytics API (`/api/analytics/route.ts`)
- Edge cached (light caching)
- Status: ✅ Configured

---

## ✅ Geocoding Safeguards - VERIFIED

### Rate Limiting
```typescript
// app/api/incidents/route.ts:39
MAX_GEOCODE_CAP: Limits total geocodes per request
GEOCODE_CONCURRENCY_CAP: Controls parallel requests
```

**Status:** ✅ Protects against runaway costs

---

## 🔒 Security Issues Found

### 🔴 CRITICAL: Hardcoded JWT Token
**File:** `test-apple-temecula.js:7`
```javascript
const token = 'eyJraWQiOiJKUDNDQjQzRFUyIiwidHlwIjoiSldUIiwiYWxnIjoiRVMyNTYifQ...'
```

**Risk Level:** ⚠️ Low (test file, expired token from Jan 2025)
**Action:** Remove or replace with `process.env.APPLE_MAPKIT_TEST_TOKEN`

### ✅ Apple MapKit Token - VERIFIED
**File:** `lib/apple-maps-auth.ts:33`
```typescript
// Only uses APPLE_MAPKIT_TEST_TOKEN in non-production
if (process.env.APPLE_MAPKIT_TEST_TOKEN && process.env.VERCEL_ENV !== 'production')
```

**Status:** ✅ Secure - no hardcoded production tokens

---

## 📋 Environment Variables Required

### Production (Required)
```bash
# Mapbox (client-side)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here

# Apple MapKit (server-side)
APPLE_MAPKIT_TEAM_ID=your_team_id
APPLE_MAPKIT_KEY_ID=your_key_id
APPLE_MAPKIT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### Optional Tuning
```bash
# Polling
NEXT_PUBLIC_AUTO_REFRESH_INTERVAL_MS=300000  # 5 min

# Caching
INCIDENTS_S_MAXAGE=120                        # 2 min
INCIDENTS_STALE_WHILE_REVALIDATE=300         # 5 min

# Geocoding
GEOCODE_CACHE_TTL_SECONDS=259200             # 3 days
```

### Development/Test Only
```bash
APPLE_MAPKIT_TEST_TOKEN=eyJ...  # For testing
```

---

## 🧹 Cleanup Recommendations

### Low Priority
1. Legacy API route removed
   - File: `app/api/mapbox-token/route.ts` (deleted)
   - Rationale: Client uses `NEXT_PUBLIC_MAPBOX_TOKEN` directly

2. **Clean up test file** (security hygiene)
   - File: `test-apple-temecula.js:7`
   - Action: Replace hardcoded token with env var

### Future Enhancements
1. **Single-tab leader polling** (cost optimization)
   - Use BroadcastChannel API for cross-tab coordination
   - Only one tab polls, others sync via channel
   - Optional - current implementation is already efficient

## 🔍 PR/Issue/Comment Secret Audit

Source-code history is now flattened, but secrets can also leak through:
- Closed PR bodies and review comments
- Issue bodies and comments
- Commit comments and release notes

Use the GitHub metadata scanner to detect these:

```bash
# Requires Node 18+ and a token with repo read access
export GITHUB_TOKEN=ghp_xxx
pnpm tsx scripts/scan-github-secrets.ts --owner drunknbass --repo sentinel

# Output: github-secret-audit.json with all findings grouped by severity
```

Remediation
- Issue comments: `gh api -X DELETE repos/:owner/:repo/issues/comments/:comment_id`
- PR review comments: `gh api -X DELETE repos/:owner/:repo/pulls/comments/:comment_id`
- Commit comments: `gh api -X DELETE repos/:owner/:repo/comments/:comment_id`
- Optional: Minimize via GraphQL mutation `minimizeComment` instead of delete

Notes
- Secrets in comments can persist independently of Git history. Always rotate any actual credentials.
- For attachments (user-images.githubusercontent.com) or cached diffs, deletion may not immediately purge caches; consider contacting GitHub Support if needed.

---

## ✅ Deployment Checklist

Before deploying to production:

- [ ] New Mapbox token configured in Vercel (Production, Preview, Development)
- [ ] Mapbox token restricted in dashboard (URL + scopes)
- [ ] Apple MapKit credentials configured in Vercel
- [ ] Upstash Redis configured
- [ ] Test polling behavior (5 min interval, respects tab visibility)
- [ ] Verify edge caching (check response headers)
- [ ] Confirm `?nocache=1` bypass works

---

## 📊 Summary

**Overall Status:** ✅ **EXCELLENT**

| Category | Status | Notes |
|----------|--------|-------|
| Mapbox Token | ✅ | Properly configured, needs URL restriction |
| Polling | ✅ | Well-implemented with safety checks |
| Caching | ✅ | Edge cached, tunable, respects nocache |
| Geocoding | ✅ | Rate limited and capped |
| Security | ⚠️ | One minor test file issue (low risk) |

**Critical Actions:**
1. Restrict Mapbox token in dashboard
2. Verify new token deployed to production

**Optional Cleanup:**
1. Remove unused `/api/mapbox-token` route
2. Fix hardcoded token in test file
