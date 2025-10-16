import { Redis } from '@upstash/redis';
import type { GeocodeResult } from './geocode';

/**
 * Upstash Redis-based geocoding cache
 *
 * This provides edge-cached geocoding results using Upstash Redis.
 * Only works when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars are set.
 *
 * Upstash Free Tier Limits:
 * - 10,000 commands/day
 * - Persistent storage
 * - Global replication
 *
 * For this app (200 unique addresses):
 * - Writes: ~200/month (one per unique address)
 * - Reads: Depends on traffic, but well within limits
 * - Storage: ~20 KB (200 addresses × 100 bytes)
 */

const KV_PREFIX = 'geocode:';
const KV_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * Check if Upstash Redis is configured
 */
function isKVConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return !!(url && token);
}

/**
 * Get Redis client instance
 */
function getRedisClient() {
  if (!isKVConfigured()) return null;

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  return new Redis({
    url: url!,
    token: token!,
  });
}

/**
 * Try to get geocode result from Upstash Redis
 * Returns null if not found or if Redis is not configured
 */
export async function getFromVercelKV(address: string, area: string | null): Promise<GeocodeResult | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const key = `${KV_PREFIX}${address}|${area || ''}`;
    const value = await redis.get<GeocodeResult>(key);

    if (value && typeof value === 'object' && 'lat' in value && 'lon' in value) {
      console.log('[GEOCODE] Upstash Redis cache hit:', key);
      return value;
    }

    return null;
  } catch (err) {
    // Redis failure is non-fatal - just fall through to local geocoding
    console.log('[GEOCODE] Upstash Redis get error (non-fatal):', (err as Error).message);
    return null;
  }
}

/**
 * Try to save geocode result to Upstash Redis
 * Failures are logged but non-fatal
 */
export async function saveToVercelKV(address: string, area: string | null, value: GeocodeResult): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const key = `${KV_PREFIX}${address}|${area || ''}`;
    await redis.set(key, JSON.stringify(value), { ex: KV_TTL_SECONDS });
    console.log('[GEOCODE] Saved to Upstash Redis:', key);
  } catch (err) {
    // Redis failure is non-fatal
    console.log('[GEOCODE] Upstash Redis save error (non-fatal):', (err as Error).message);
  }
}
