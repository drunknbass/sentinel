import { Redis } from '@upstash/redis';

/**
 * Analytics tracking using Upstash Redis
 * Tracks daily unique visitors to understand traffic patterns
 */

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
 * Get today's date key (YYYY-MM-DD format)
 */
function getTodayKey(): string {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Track a page view
 * Increments the daily counter in Vercel KV
 */
export async function trackPageView(): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const key = `views:${getTodayKey()}`;
    await redis.incr(key);
    // Set expiry to 32 days (preserve data for a month)
    await redis.expire(key, 32 * 24 * 60 * 60);
  } catch (err) {
    // Analytics failure is non-fatal
    console.log('[ANALYTICS] Track page view error (non-fatal):', (err as Error).message);
  }
}

/**
 * Get page views for the last N days
 * Returns an array of {date, views} objects
 */
export async function getPageViews(days: number = 7): Promise<{ date: string; views: number }[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  try {
    const results: { date: string; views: number }[] = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const key = `views:${dateKey}`;

      const views = await redis.get<number>(key);
      results.push({
        date: dateKey,
        views: views || 0
      });
    }

    return results.reverse(); // Return oldest to newest
  } catch (err) {
    console.log('[ANALYTICS] Get page views error (non-fatal):', (err as Error).message);
    return [];
  }
}

/**
 * Get total views for today
 */
export async function getTodayViews(): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return 0;

  try {
    const key = `views:${getTodayKey()}`;
    const views = await redis.get<number>(key);
    return views || 0;
  } catch (err) {
    console.log('[ANALYTICS] Get today views error (non-fatal):', (err as Error).message);
    return 0;
  }
}
