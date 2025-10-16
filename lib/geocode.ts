import { TTLCache } from './cache';
import { getFromVercelKV, saveToVercelKV } from './geocode-cache';

export type GeocodeResult = {
  lat: number | null;
  lon: number | null;
  approximate?: boolean; // True if geocoded from area/street only
};

const geocodeCache = new TTLCache<GeocodeResult>(
  Number(process.env.GEOCODE_CACHE_TTL_SECONDS || 259200) * 1000 // 3 days default (259200 seconds)
);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isGeocodeEnabled = () =>
  String(process.env.GEOCODE_ENABLED || '').toLowerCase() === 'true';


/**
 * Geocode using OpenStreetMap Nominatim (free, flexible)
 * Better at handling partial addresses than Census Bureau
 */
async function geocodeWithNominatim(address: string, area: string | null): Promise<GeocodeResult> {
  const q = `${address}${area ? `, ${area}` : ''}, Riverside County, CA`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;

  // Fallback only: keep a small delay to be nice to OSM
  await sleep(Number(process.env.NOMINATIM_DELAY_MS || 800));

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Sentinel-RSO-Demo/1.0 (incident-tracker)',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      console.log('[GEOCODE] Nominatim error:', res.status, res.statusText);
      return { lat: null, lon: null };
    }

    const data: any = await res.json();
    if (data && data.length > 0) {
      const result = data[0];
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);

      if (lat && lon) {
        console.log('[GEOCODE] Nominatim success:', address, '→', { lat, lon });
        return { lat, lon, approximate: false };
      }
    }

    return { lat: null, lon: null };
  } catch (err) {
    console.log('[GEOCODE] Nominatim fetch error:', err);
    return { lat: null, lon: null };
  }
}

/**
 * Parse block addresses like "2600 *** BLOCK AMANDA AV" to extract street name
 * Returns null if not a block address, or the parsed street name
 */
function parseBlockAddress(address: string): string | null {
  // Match patterns like "2600 *** BLOCK AMANDA AV" or "100 BLOCK MAIN ST"
  const blockMatch = address.match(/\d+\s+(?:\*+\s+)?BLOCK\s+(.+)/i);
  if (blockMatch) {
    return blockMatch[1].trim(); // Return just the street name
  }
  return null;
}

/**
 * Geocode using US Census Bureau API (free, slower)
 */
async function geocodeWithCensus(address: string, area: string | null, allowApproximate = true): Promise<GeocodeResult> {
  const base =
    process.env.CENSUS_GEOCODER_BASE ||
    'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';

  // Try exact address first
  const exactQuery = `${address}${area ? `, ${area}` : ''}, Riverside County, CA`;
  const exactUrl = `${base}?address=${encodeURIComponent(
    exactQuery
  )}&benchmark=Public_AR_Current&format=json`;

  // Reduced delay from 500ms to 100ms - Census API can handle more requests
  await sleep(100);

  try {
    const res = await fetch(exactUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'rso-demo/1.0'
      }
    });
    const data: any = await res.json();
    const match = data?.result?.addressMatches?.[0];
    const lat = match?.coordinates?.y ?? null;
    const lon = match?.coordinates?.x ?? null;

    if (lat && lon) {
      return { lat, lon, approximate: false };
    }
  } catch (err) {
    console.log('[GEOCODE] Census exact match failed:', err);
  }

  // If exact match failed and approximate is allowed, try parsing block address
  if (allowApproximate) {
    const streetName = parseBlockAddress(address);
    if (streetName && area) {
      console.log('[GEOCODE] Trying approximate geocode for block address:', streetName, 'in', area);

      const approxQuery = `${streetName}, ${area}, Riverside County, CA`;
      const approxUrl = `${base}?address=${encodeURIComponent(
        approxQuery
      )}&benchmark=Public_AR_Current&format=json`;

      await sleep(100);

      try {
        const res = await fetch(approxUrl, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'rso-demo/1.0'
          }
        });
        const data: any = await res.json();
        const match = data?.result?.addressMatches?.[0];
        const lat = match?.coordinates?.y ?? null;
        const lon = match?.coordinates?.x ?? null;

        if (lat && lon) {
          console.log('[GEOCODE] Approximate geocode success:', streetName, '→', { lat, lon });
          return { lat, lon, approximate: true };
        }
      } catch (err) {
        console.log('[GEOCODE] Census approximate match failed:', err);
      }
    }
  }

  return { lat: null, lon: null };
}

/**
 * Geocode an address using multi-tier caching:
 * 1. Local memory cache (instant)
 * 2. Vercel KV edge cache (fast, shared across deployments)
 * 3. OpenStreetMap Nominatim (primary geocoder)
 * 4. Census Bureau (fallback geocoder)
 */
export async function geocodeOne(address: string | null, area: string | null): Promise<GeocodeResult> {
  if (!isGeocodeEnabled() || !address) return { lat: null, lon: null };

  const key = `geo:${address}|${area || ''}`;

  // Tier 1: Check local memory cache (instant)
  const localHit = geocodeCache.get(key);
  if (localHit) {
    console.log('[GEOCODE] Local cache hit:', key);
    return localHit;
  }

  // Tier 2: Check Vercel KV edge cache (fast, shared across instances)
  const kvHit = await getFromVercelKV(address, area);
  if (kvHit) {
    // Populate local cache for next time
    geocodeCache.set(key, kvHit);
    return kvHit;
  }

  // Tier 3 & 4: Geocode from APIs (slow)
  console.log('[GEOCODE] Cache miss, geocoding:', key);

  // Prefer Census first (generally faster; avoids Nominatim 1 rps guidance)
  let value = await geocodeWithCensus(address, area);

  // Fallback to Nominatim only if Census fails
  if (value.lat === null && value.lon === null) {
    value = await geocodeWithNominatim(address, area);
  }

  // Save to both caches (fire-and-forget for Vercel KV)
  geocodeCache.set(key, value);
  saveToVercelKV(address, area, value).catch(() => {}); // Non-blocking

  return value;
}
