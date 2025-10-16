/**
 * Cloudflare Workers KV Geocoding Cache
 *
 * Deploy this to Cloudflare Workers with a KV namespace binding named "GEOCODE_CACHE"
 *
 * Setup:
 * 1. Create a KV namespace: `wrangler kv:namespace create GEOCODE_CACHE`
 * 2. Add to wrangler.toml:
 *    kv_namespaces = [
 *      { binding = "GEOCODE_CACHE", id = "<your-namespace-id>" }
 *    ]
 * 3. Deploy: `wrangler deploy`
 * 4. Set GEOCODE_CACHE_URL in your app's .env to your worker URL
 *
 * This provides a globally distributed, low-latency geocoding cache at the edge.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Extract key from URL: /geocode/{key}
    const match = url.pathname.match(/^\/geocode\/(.+)$/);
    if (!match) {
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    }

    const key = decodeURIComponent(match[1]);

    // GET: Retrieve geocode result from cache
    if (request.method === 'GET') {
      const value = await env.GEOCODE_CACHE.get(key, 'json');

      if (value) {
        return new Response(JSON.stringify(value), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=604800', // 7 days browser cache
            ...corsHeaders
          }
        });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    }

    // PUT: Save geocode result to cache
    if (request.method === 'PUT') {
      try {
        const data = await request.json();

        // Validate the geocode result structure
        if (typeof data !== 'object' || !('lat' in data) || !('lon' in data)) {
          return new Response('Invalid data format', {
            status: 400,
            headers: corsHeaders
          });
        }

        // Store in KV with 30-day TTL (2592000 seconds)
        // KV is eventually consistent, but that's fine for geocoding cache
        await env.GEOCODE_CACHE.put(key, JSON.stringify(data), {
          expirationTtl: 2592000 // 30 days
        });

        return new Response('OK', {
          status: 200,
          headers: corsHeaders
        });
      } catch (err) {
        return new Response('Invalid JSON', {
          status: 400,
          headers: corsHeaders
        });
      }
    }

    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders
    });
  }
};
