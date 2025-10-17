import { TTLCache } from './cache';
import { getFromVercelKV, saveToVercelKV } from './geocode-cache';
import { generateAppleMapsToken } from './apple-maps-auth';

export type GeocodeResult = {
  lat: number | null;
  lon: number | null;
  approximate?: boolean; // True if geocoded from area/street only
  strategy?: 'apple_maps' | 'census' | 'nominatim'; // Which service provided the result
  centroid_used?: string; // Which centroid was used for userLocation (e.g., 'jurupa', 'TEMECULA', 'county_center')
  error?: string; // Error message if geocoding failed
  query?: string; // The query sent to the geocoding service
  user_location?: string; // The userLocation coordinates used
};

const geocodeCache = new TTLCache<GeocodeResult>(
  Number(process.env.GEOCODE_CACHE_TTL_SECONDS || 259200) * 1000 // 3 days default (259200 seconds)
);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Riverside County geographic centroid coordinates
const RIVERSIDE_COUNTY_CENTER = {
  lat: 33.73,
  lon: -115.98
};

// Area-specific coordinates for better geocoding accuracy
// These help Apple Maps provide better results for vague addresses
// Total: 109 locations (28 incorporated cities + 81 unincorporated/special areas)
export const AREA_COORDINATES: Record<string, { lat: number; lon: number }> = {
  // === INCORPORATED CITIES ===

  // Western cities (closer to LA/Orange County)
  'CORONA': { lat: 33.8753, lon: -117.5664 },
  'EASTVALE': { lat: 33.9631, lon: -117.5627 },
  'JURUPA VALLEY': { lat: 33.9956, lon: -117.4854 },
  'NORCO': { lat: 33.9312, lon: -117.5487 },
  'RIVERSIDE': { lat: 33.9534, lon: -117.3962 },

  // Central Valley cities
  'MORENO VALLEY': { lat: 33.9425, lon: -117.2297 },
  'PERRIS': { lat: 33.7825, lon: -117.2287 },
  'MENIFEE': { lat: 33.6784, lon: -117.1466 },
  'CANYON LAKE': { lat: 33.6850, lon: -117.2731 },
  'LAKE ELSINORE': { lat: 33.6681, lon: -117.3273 },
  'WILDOMAR': { lat: 33.5989, lon: -117.2800 },
  'MURRIETA': { lat: 33.5539, lon: -117.2139 },
  'TEMECULA': { lat: 33.4936, lon: -117.1484 },

  // San Jacinto Valley cities
  'HEMET': { lat: 33.7475, lon: -116.9717 },
  'SAN JACINTO': { lat: 33.7839, lon: -116.9586 },

  // Pass Area cities
  'BEAUMONT': { lat: 33.9295, lon: -116.9770 },
  'BANNING': { lat: 33.9256, lon: -116.8764 },
  'CALIMESA': { lat: 33.9942, lon: -117.0628 },

  // Coachella Valley cities
  'PALM SPRINGS': { lat: 33.8303, lon: -116.5453 },
  'CATHEDRAL CITY': { lat: 33.7797, lon: -116.4653 },
  'RANCHO MIRAGE': { lat: 33.7397, lon: -116.4128 },
  'PALM DESERT': { lat: 33.7222, lon: -116.3745 },
  'INDIAN WELLS': { lat: 33.7178, lon: -116.3408 },
  'LA QUINTA': { lat: 33.6634, lon: -116.3100 },
  'INDIO': { lat: 33.7206, lon: -116.2156 },
  'COACHELLA': { lat: 33.6803, lon: -116.1739 },
  'DESERT HOT SPRINGS': { lat: 33.9611, lon: -116.5017 },

  // Palo Verde Valley
  'BLYTHE': { lat: 33.6103, lon: -114.5886 },

  // === UNINCORPORATED COMMUNITIES & CENSUS DESIGNATED PLACES ===

  // Western unincorporated
  'WOODCREST': { lat: 33.8839, lon: -117.3572 },
  'MEAD VALLEY': { lat: 33.8325, lon: -117.2964 },
  'GOOD HOPE': { lat: 33.7459, lon: -117.2567 },
  'MEADOWBROOK': { lat: 33.7425, lon: -117.2833 },
  'LAKELAND VILLAGE': { lat: 33.6414, lon: -117.3661 },
  'WARM SPRINGS': { lat: 33.6178, lon: -117.3147 },
  'TEMESCAL VALLEY': { lat: 33.7447, lon: -117.4764 },
  'EL SOBRANTE': { lat: 33.8747, lon: -117.4936 },
  'CORONITA': { lat: 33.8747, lon: -117.5103 },
  'HOME GARDENS': { lat: 33.8781, lon: -117.5211 },
  'EL CERRITO': { lat: 33.8364, lon: -117.5478 },

  // Central unincorporated
  'MARCH ARB': { lat: 33.8878, lon: -117.2589 },
  'MARCH AIR RESERVE BASE': { lat: 33.8878, lon: -117.2589 },
  'HIGHGROVE': { lat: 33.9847, lon: -117.3306 },
  'GRAND TERRACE': { lat: 34.0339, lon: -117.3136 },
  'NUEVO': { lat: 33.8011, lon: -117.1458 },
  'LAKEVIEW': { lat: 33.8400, lon: -117.1081 },
  'ROMOLAND': { lat: 33.7464, lon: -117.1753 },
  'HOMELAND': { lat: 33.7475, lon: -117.1108 },
  'GREEN ACRES': { lat: 33.7631, lon: -117.0936 },
  'WINCHESTER': { lat: 33.7067, lon: -117.0847 },
  'FRENCH VALLEY': { lat: 33.5489, lon: -117.1061 },
  'QUAIL VALLEY': { lat: 33.7070, lon: -117.2391 },

  // San Jacinto Valley unincorporated
  'VALLE VISTA': { lat: 33.7417, lon: -116.8933 },
  'EAST HEMET': { lat: 33.7400, lon: -116.9392 },
  'DIAMOND VALLEY': { lat: 33.7111, lon: -116.9803 },
  'SAGE': { lat: 33.5700, lon: -116.8964 },

  // Mountain communities
  'IDYLLWILD': { lat: 33.7400, lon: -116.7189 },
  'IDYLLWILD-PINE COVE': { lat: 33.7489, lon: -116.7253 },
  'MOUNTAIN CENTER': { lat: 33.7039, lon: -116.7253 },
  'ANZA': { lat: 33.5550, lon: -116.6742 },
  'AGUANGA': { lat: 33.4425, lon: -116.8650 },
  'CABAZON': { lat: 33.9175, lon: -116.7875 },
  'WHITEWATER': { lat: 33.9261, lon: -116.6481 },

  // Desert communities
  'THOUSAND PALMS': { lat: 33.8206, lon: -116.3906 },
  'BERMUDA DUNES': { lat: 33.7428, lon: -116.2900 },
  'DESERT CENTER': { lat: 33.7131, lon: -115.4003 },
  'NORTH PALM SPRINGS': { lat: 33.9244, lon: -116.5436 },
  'GARNET': { lat: 33.8978, lon: -116.5589 },
  'SKY VALLEY': { lat: 33.8856, lon: -116.3814 },
  'DESERT EDGE': { lat: 33.7547, lon: -116.4353 },
  'DESERT PALMS': { lat: 33.7253, lon: -116.3969 },
  'VISTA SANTA ROSA': { lat: 33.6397, lon: -116.2411 },
  'THERMAL': { lat: 33.6403, lon: -116.1394 },
  'OASIS': { lat: 33.5178, lon: -116.0836 },
  'MECCA': { lat: 33.5725, lon: -116.0772 },
  'NORTH SHORE': { lat: 33.5206, lon: -116.0158 },
  'DESERT BEACH': { lat: 33.4453, lon: -115.9531 },
  'MESA VERDE': { lat: 33.6831, lon: -114.5972 },
  'RIPLEY': { lat: 33.5283, lon: -114.6439 },
  'EAST BLYTHE': { lat: 33.6178, lon: -114.5117 },

  // Lake areas
  'LAKE RIVERSIDE': { lat: 33.4206, lon: -116.8972 },
  'LAKE MATHEWS': { lat: 33.8533, lon: -117.4289 },
  'LAKE HILLS': { lat: 33.6475, lon: -117.4147 },

  // Special areas
  'HORSETHIEF CANYON': { lat: 33.7408, lon: -117.4453 },
  'GLEN IVY': { lat: 33.7350, lon: -117.4950 },
  'GLEN IVY HOT SPRINGS': { lat: 33.7350, lon: -117.4950 },
  'GLEN IVY HOT SPRGS': { lat: 33.7350, lon: -117.4950 },
  'MARCH FIELD': { lat: 33.8878, lon: -117.2589 },
  'CHERRY VALLEY': { lat: 33.9728, lon: -116.9772 },

  // Additional areas found in incidents
  'GILMAN HOT SPRINGS': { lat: 33.7389, lon: -116.8736 },
  'MURRIETA HOT SPRINGS': { lat: 33.5589, lon: -117.1522 },
  'MURRIETA HOT SPRGS': { lat: 33.5589, lon: -117.1522 },
  'RECHE CANYON': { lat: 34.0147, lon: -117.1844 },
  'SAN GORGONIO': { lat: 34.0217, lon: -116.8247 },
  'PINE MEADOWS': { lat: 33.7517, lon: -116.6744 },
  'POPPET FLATS': { lat: 33.8075, lon: -116.6147 },
  'SPANISH HILLS': { lat: 33.9161, lon: -116.7850 },
  'WOLF VALLEY': { lat: 34.0831, lon: -117.2706 },
  'SOUTH SUNSET': { lat: 33.9256, lon: -116.8222 },
  'SOUTHEAST DHS': { lat: 33.9411, lon: -116.4817 },
  'DEL WEB': { lat: 33.9286, lon: -116.9775 },
  'W ELSINORE': { lat: 33.6681, lon: -117.3473 },
  'MARCH JPA': { lat: 33.8878, lon: -117.2589 },

  // Tribal lands
  'AUGUSTINE IR': { lat: 33.6717, lon: -116.1478 },
  'MORONGO I R': { lat: 33.9461, lon: -116.8228 },

  // Variations
  'RIVERSIDE CITY': { lat: 33.9534, lon: -117.3962 },
  'CITY OF NORCO': { lat: 33.9312, lon: -117.5487 },
  'JURUPA VALLEY - COUNTY': { lat: 33.9956, lon: -117.4854 },
  'PERRIS - COUNTY': { lat: 33.7825, lon: -117.2287 },
  'SOUTHWEST': { lat: 33.5500, lon: -117.2000 }
};

// Regional centroids for dispatch regions
// Calculated from averaging the coordinates of areas within each region
export const REGION_CENTROIDS: Record<string, { lat: number; lon: number }> = {
  // Southwest Region: Temecula, Murrieta, Wildomar, Lake Elsinore, Canyon Lake, Menifee
  'southwest': {
    lat: 33.616,  // Average of Southwest areas
    lon: -117.217
  },

  // Jurupa Valley Region: Jurupa Valley, Eastvale, Norco
  'jurupa': {
    lat: 33.963,  // Average of Jurupa Valley areas
    lon: -117.512
  },

  // Central Region: Riverside, Corona, parts of unincorporated areas
  'central': {
    lat: 33.915,  // Average of Central areas
    lon: -117.481
  },

  // Moreno Valley Region: Moreno Valley, Perris, parts of unincorporated
  'moreno': {
    lat: 33.863,  // Average of Moreno Valley areas
    lon: -117.229
  },

  // Desert Region: All Coachella Valley cities
  'desert': {
    lat: 33.723,  // Average of Desert areas
    lon: -116.372
  },

  // San Jacinto Region: Hemet, San Jacinto, Beaumont, Banning, mountain communities
  'sanjacinto': {
    lat: 33.789,  // Average of San Jacinto Valley and mountain areas
    lon: -116.862
  },

  // For "All Regions" or when no specific region is selected
  'all': RIVERSIDE_COUNTY_CENTER
};

/**
 * Geocode using Apple Maps API
 * Excellent at handling block addresses and partial addresses with user location context
 */
async function geocodeWithAppleMaps(address: string, area: string | null, station?: string): Promise<GeocodeResult> {
  const token = await generateAppleMapsToken();
  if (!token) {
    console.log('[GEOCODE] Apple Maps token generation failed, falling back');
    return {
      lat: null,
      lon: null,
      error: 'No Apple Maps token available',
      query: `${address}${area ? `, ${area}` : ''}`
    };
  }

  // Construct the query - just address and area, no extra county/state
  const q = `${address}${area ? `, ${area}` : ''}`;

  // Priority for user location:
  // 1. Use regional centroid if station is provided
  // 2. Use area-specific coordinates if area matches
  // 3. Fall back to county center
  let userLocation = RIVERSIDE_COUNTY_CENTER;
  let centroidUsed = 'county_center';

  // First check if we have a station/region - this provides the best context
  if (station) {
    const stationLower = station.toLowerCase().trim();
    if (REGION_CENTROIDS[stationLower]) {
      userLocation = REGION_CENTROIDS[stationLower];
      centroidUsed = `region:${station}`;
      console.log(`[GEOCODE] Using regional centroid for station ${station}:`, userLocation);
    }
  }

  // If we have an area, check for more specific coordinates
  if (area) {
    const areaUpper = area.toUpperCase().trim();
    if (AREA_COORDINATES[areaUpper]) {
      userLocation = AREA_COORDINATES[areaUpper];
      centroidUsed = `area:${area}`;
      console.log(`[GEOCODE] Using area-specific location for ${area}:`, userLocation);
    }
  }

  const userLocationStr = `${userLocation.lat},${userLocation.lon}`;
  const url = new URL('https://maps-api.apple.com/v1/geocode');
  url.searchParams.append('q', q);
  url.searchParams.append('limitToCountries', 'US');
  url.searchParams.append('userLocation', userLocationStr);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.log('[GEOCODE] Apple Maps error:', res.status, res.statusText, errorText);
      return {
        lat: null,
        lon: null,
        error: `Apple Maps API error: ${res.status} ${res.statusText}`,
        query: q,
        user_location: userLocationStr
      };
    }

    const data: any = await res.json();
    if (data?.results && data.results.length > 0) {
      const result = data.results[0];
      const lat = result.coordinate?.latitude;
      const lon = result.coordinate?.longitude;

      if (lat && lon) {
        console.log('[GEOCODE] Apple Maps success:', address, '→', { lat, lon }, `using ${centroidUsed}`);
        return {
          lat,
          lon,
          approximate: false,
          strategy: 'apple_maps',
          centroid_used: centroidUsed,
          query: q,
          user_location: userLocationStr
        };
      }
    }

    console.log('[GEOCODE] Apple Maps returned no results for:', q, 'with userLocation:', userLocationStr);
    return {
      lat: null,
      lon: null,
      error: 'No results from Apple Maps',
      query: q,
      user_location: userLocationStr
    };
  } catch (err: any) {
    console.log('[GEOCODE] Apple Maps fetch error:', err.message);
    return {
      lat: null,
      lon: null,
      error: `Apple Maps fetch error: ${err.message}`,
      query: q,
      user_location: userLocationStr
    };
  }
}

/**
 * Geocode using OpenStreetMap Nominatim (free, flexible)
 * Better at handling partial addresses than Census Bureau
 */
async function geocodeWithNominatim(address: string, area: string | null): Promise<GeocodeResult> {
  // Try to parse block addresses
  const parsedAddress = parseBlockAddress(address);
  const useAddress = parsedAddress || address;

  const q = `${useAddress}${area ? `, ${area}` : ''}, Riverside County, CA`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;

  console.log('[GEOCODE] Nominatim trying:', q);

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
        return { lat, lon, approximate: parsedAddress !== null, strategy: 'nominatim' };
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
  const blockMatch = address.match(/(\d+)\s+(?:\*+\s+)?BLOCK\s+(.+)/i);
  if (blockMatch) {
    const blockNumber = blockMatch[1];
    const streetName = blockMatch[2].trim();
    // Return approximate address with block number for better geocoding
    return `${blockNumber} ${streetName}`;
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
      return { lat, lon, approximate: false, strategy: 'census' };
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
          return { lat, lon, approximate: true, strategy: 'census' };
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
 * 3. Apple Maps API (primary - excellent for block addresses)
 * 4. US Census Bureau (fallback - good for exact addresses)
 * 5. OpenStreetMap Nominatim (final fallback)
 */
export async function geocodeOne(address: string | null, area: string | null, nocache: boolean = false, station?: string, forceGeocode?: 'apple' | 'census' | 'nominatim'): Promise<GeocodeResult> {
  if (!address) return { lat: null, lon: null };

  const key = `geo:${address}|${area || ''}`;

  // Skip all caches if nocache is true
  if (!nocache) {
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
  }

  // Tier 3, 4 & 5: Geocode from APIs (slow)
  console.log('[GEOCODE] Cache miss, geocoding:', key, station ? `(station: ${station})` : '', forceGeocode ? `(force: ${forceGeocode})` : '');

  let value: GeocodeResult = { lat: null, lon: null };

  // If forceGeocode is set, only use that service
  if (forceGeocode) {
    console.log(`[GEOCODE] Forcing ${forceGeocode} geocoding service`);
    switch (forceGeocode) {
      case 'apple':
        value = await geocodeWithAppleMaps(address, area, station);
        break;
      case 'census':
        value = await geocodeWithCensus(address, area);
        break;
      case 'nominatim':
        value = await geocodeWithNominatim(address, area);
        break;
    }
  } else {
    // Normal fallback chain
    // Try Apple Maps first (best for block addresses with user location context)
    value = await geocodeWithAppleMaps(address, area, station);

    // Fallback to Census if Apple Maps fails
    if (value.lat === null && value.lon === null) {
      value = await geocodeWithCensus(address, area);
    }

    // Final fallback to Nominatim if both fail
    if (value.lat === null && value.lon === null) {
      value = await geocodeWithNominatim(address, area);
    }
  }

  // Only cache successful geocoding results (don't cache null results) and when nocache is false
  if (value.lat !== null && value.lon !== null && !nocache) {
    geocodeCache.set(key, value);
    saveToVercelKV(address, area, value).catch(() => {}); // Non-blocking
  }

  return value;
}
