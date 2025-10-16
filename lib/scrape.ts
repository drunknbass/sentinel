import * as cheerio from 'cheerio';
import dayjs from 'dayjs';
import { classify } from './classify';
import { sharedCache } from './cache';
import { geocodeOne } from './geocode';
import { mapLimit } from './async';
import { fetchIncidentsUntil } from './sources/pressaccess-client';

export type RawRow = Record<string, string>;

export type Item = {
  incident_id: string;
  call_type: string;
  call_category: string;
  priority: number;
  received_at: string;
  address_raw: string | null;
  area: string | null;
  disposition: string | null;
  lat: number | null;
  lon: number | null;
  location_approximate?: boolean; // True if geocoded from area/street only (not exact address)
};

const SOURCES = [
  'https://pressaccess.riversidesheriff.org/',
  'https://publicaccess.riversidesheriff.org/'
];

const headerAliases = new Map<string, string[]>([
  ['incident', ['incident', 'id', 'incident #', 'incident number']],
  ['callType', ['call type', 'type', 'incident type']],
  ['received', ['received', 'time', 'call received']],
  ['address', ['address', 'location', 'address/location']],
  ['area', ['area', 'region', 'station']],
  ['disposition', ['dispo', 'disposition', 'status']]
]);

const normalizeHeader = (val: string) =>
  val
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const findByAlias = (row: RawRow, target: string) => {
  const aliases = headerAliases.get(target) ?? [];
  for (const alias of aliases) {
    const hit = Object.entries(row).find(([key]) => normalizeHeader(key) === normalizeHeader(alias));
    if (hit) return hit[1];
  }
  return '';
};

const parseDate = (value: string | undefined) => {
  if (!value) return null;
  const parsed = dayjs(value, ['M/D/YYYY, h:mm A', 'M/D/YYYY h:mm A', 'MM/DD/YYYY, hh:mm A', 'M/D/YYYY H:mm'], true);
  return parsed.isValid() ? parsed.toDate() : null;
};

const normalizeRow = (row: RawRow): Omit<Item, 'lat' | 'lon'> => {
  const incident = findByAlias(row, 'incident').trim();
  const callType = findByAlias(row, 'callType').trim();
  const receivedRaw = findByAlias(row, 'received').trim();
  const address = findByAlias(row, 'address').trim();
  const area = findByAlias(row, 'area').trim();
  const disposition = findByAlias(row, 'disposition').trim();
  const receivedAt = parseDate(receivedRaw) ?? new Date();

  const { category, priority } = classify(callType);

  return {
    incident_id: incident,
    call_type: callType,
    call_category: category,
    priority,
    received_at: receivedAt.toISOString(),
    address_raw: address || null,
    area: area || null,
    disposition: disposition || null
  };
};

async function fetchHtml(): Promise<string> {
  for (const url of SOURCES) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
        },
        next: { revalidate: Number(process.env.CACHE_TTL_SECONDS || 60) }
      });
      if (res.ok) return await res.text();
    } catch {
      // Try the next fallback.
    }
  }
  throw new Error('Unable to fetch RSO page from known endpoints');
}

export type ProgressCallback = (stage: string, current?: number, total?: number) => void;

export async function scrapeIncidents({
  geocode = false,
  since,
  onProgress,
  station,
  maxGeocode = Number(process.env.MAX_GEOCODE_PER_REQUEST || 40),
  geocodeConcurrency = Number(process.env.GEOCODE_CONCURRENCY || 3)
}: {
  geocode?: boolean;
  since?: string;
  onProgress?: ProgressCallback;
  station?: string;
  maxGeocode?: number;
  geocodeConcurrency?: number;
} = {}): Promise<Item[]> {
  // Include 'since' and 'station' in cache key for time-aware caching
  const cacheKey = `incidents:geocode=${geocode}:since=${since || 'all'}:station=${station || 'all'}`;
  const cached = sharedCache.get(cacheKey);
  if (cached) {
    console.log('[SCRAPER] Cache hit:', cacheKey);
    return cached as Item[];
  }

  console.log('[SCRAPER] Cache miss, fetching fresh data');
  console.log('[SCRAPER] Starting fetch. Geocode:', geocode, 'Since:', since);
  console.log('[SCRAPER] Cache key:', cacheKey);

  try {
    console.log('[SCRAPER] Attempting to fetch from RSO API with time filter...');
    // Use smart pagination - fetch until we have all incidents in time range
    const apiData = await fetchIncidentsUntil(since, 10, 1000, station);
    console.log('[SCRAPER] API returned', apiData.length, 'incidents');
    if (apiData.length === 0) {
      throw new Error('API returned no incidents; falling back to HTML');
    }
    console.log('[SCRAPER] First API incident:', apiData[0]);

    const items: Item[] = [];

    console.log('[SCRAPER] Processing incidents with geocode =', geocode);
    onProgress?.('Fetching', apiData.length, apiData.length);

    // First copy all base items
    for (let i = 0; i < apiData.length; i++) {
      items.push({ ...apiData[i], lat: null, lon: null });
    }

    if (geocode) {
      const candidates = items
        .map((it, idx) => ({ idx, it }))
        .filter(({ it }) => !!it.address_raw && !/undefined/i.test(it.address_raw!))
        .slice(0, Math.max(0, maxGeocode));

      console.log('[SCRAPER] Geocoding candidates:', candidates.length, 'limit:', maxGeocode, 'concurrency:', geocodeConcurrency);

      let completed = 0;
      await mapLimit(candidates, Math.max(1, geocodeConcurrency), async ({ idx, it }) => {
        const result = await geocodeOne(it.address_raw!, it.area);
        items[idx].lat = result.lat;
        items[idx].lon = result.lon;
        if (result.approximate) (items[idx] as any).location_approximate = true;
        completed++;
        if (completed % 5 === 0 || completed === candidates.length) {
          onProgress?.('Geocoding', completed, candidates.length);
        }
        return null as any;
      });
    }

    const geocodedCount = items.filter(item => item.lat !== null && item.lon !== null).length;
    const exactCount = items.filter(item => item.lat !== null && item.lon !== null && !item.location_approximate).length;
    const approximateCount = items.filter(item => item.lat !== null && item.lon !== null && item.location_approximate).length;
    const addressCount = items.filter(item => item.address_raw !== null).length;
    console.log('[SCRAPER] Final items count:', items.length);
    console.log('[SCRAPER] Items with addresses:', addressCount, '/', items.length);
    console.log('[SCRAPER] Successfully geocoded:', geocodedCount, '/', addressCount, `(${exactCount} exact, ${approximateCount} approximate)`);
    console.log('[SCRAPER] Caching results...');
    sharedCache.set(cacheKey, items);
    return items;
  } catch (apiError) {
    console.error('[SCRAPER] API fetch failed:', apiError);
    console.error('[SCRAPER] Error details:', apiError instanceof Error ? apiError.stack : String(apiError));

    // Fallback to HTML scraping if API fails
    const html = await fetchHtml();
    console.log('[SCRAPER] Fetched HTML length:', html.length);
    console.log('[SCRAPER] HTML preview:', html.substring(0, 500));
    const $ = cheerio.load(html);
    const tables = $('table').toArray();
    console.log('[SCRAPER] Found', tables.length, 'tables');

    if (!tables.length) {
      console.error('[SCRAPER] No table found and API failed. No data available.');
      throw new Error('Unable to fetch incident data from API or HTML');
    }

    let items: Item[] = [];

    for (const table of tables) {
      const $table = $(table);
      const headers = $table
        .find('thead th')
        .toArray()
        .map((th) => $(th).text().trim());
      const hasKeys = headers.some((header) => /incident/i.test(header)) && headers.some((header) => /call\s*type/i.test(header));
      if (!hasKeys) continue;

      const rows = $table.find('tbody tr').toArray();
      for (const row of rows) {
        const values = $(row)
          .find('td')
          .toArray()
          .map((td) => $(td).text().trim());

        const raw: RawRow = {};
        headers.forEach((header, index) => {
          raw[header] = values[index] ?? '';
        });

        const base = normalizeRow(raw);
        items.push({ ...base, lat: null, lon: null });
      }
      if (items.length) break;
    }

    if (geocode && items.length) {
      const candidates = items
        .map((it, idx) => ({ idx, it }))
        .filter(({ it }) => !!it.address_raw && !/undefined/i.test(it.address_raw!))
        .slice(0, Math.max(0, maxGeocode));

      let completed = 0;
      await mapLimit(candidates, Math.max(1, geocodeConcurrency), async ({ idx, it }) => {
        const result = await geocodeOne(it.address_raw!, it.area);
        items[idx].lat = result.lat;
        items[idx].lon = result.lon;
        if (result.approximate) (items[idx] as any).location_approximate = true;
        completed++;
        if (completed % 5 === 0 || completed === candidates.length) {
          onProgress?.('Geocoding', completed, candidates.length);
        }
        return null as any;
      });
    }

    sharedCache.set(cacheKey, items);
    return items;
  }
}
