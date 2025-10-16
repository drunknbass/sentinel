import * as cheerio from 'cheerio';
import dayjs from 'dayjs';
import { classify } from './classify';
import { sharedCache } from './cache';
import { geocodeOne } from './geocode';

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

const findByAlias = (row: RawRow, target: keyof typeof headerAliases) => {
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
        cache: 'no-store'
      });
      if (res.ok) return await res.text();
    } catch {
      // Try the next fallback.
    }
  }
  throw new Error('Unable to fetch RSO page from known endpoints');
}

export async function scrapeIncidents({ geocode = false }: { geocode?: boolean } = {}): Promise<Item[]> {
  const cacheKey = `incidents:geocode=${geocode}`;
  const cached = sharedCache.get(cacheKey);
  if (cached) return cached as Item[];

  const html = await fetchHtml();
  const $ = cheerio.load(html);
  const tables = $('table').toArray();

  if (!tables.length) {
    throw new Error('No table found in HTML');
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
      let lat: number | null = null;
      let lon: number | null = null;

      if (geocode && base.address_raw && !/undefined/i.test(base.address_raw)) {
        const result = await geocodeOne(base.address_raw, base.area);
        lat = result.lat;
        lon = result.lon;
      }

      items.push({ ...base, lat, lon });
    }
    if (items.length) break;
  }

  sharedCache.set(cacheKey, items);
  return items;
}
