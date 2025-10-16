/**
 * RSO PressAccess Client
 *
 * Fetches incident data from the discovered JSON API endpoint
 * instead of scraping HTML tables.
 */

import { classify } from '../classify';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Enable dayjs timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

// API response structure from discovery
type RSOApiIncident = {
  cd_RowNum: number;
  cd_Inc_ID: string;
  cd_Call_Type: string;
  cd_Received: string; // ISO datetime string
  cd_Address: string;
  cd_Area: string;
  cd_Disposition: string;
  cd_Confidential_Type: boolean;
  cd_Div: string;
  cd_Station: string;
  [key: string]: any;
};

// Normalized incident format
export type NormalizedIncident = {
  incident_id: string;
  call_type: string;
  call_category: string;
  priority: number;
  received_at: string; // ISO string
  address_raw: string | null;
  area: string | null;
  disposition: string | null;
};

const BASE_URL = 'https://publicaccess.riversidesheriff.org/api/publicaccess/incidents';

/**
 * Parse date from API response
 * API returns: "2025-10-16T12:10:24" (in Pacific time, no timezone indicator)
 * We need to interpret this as America/Los_Angeles time and convert to UTC
 */
function parseDate(dateStr: string | undefined): Date {
  if (!dateStr) return new Date();

  // Parse the timestamp as Pacific time
  const parsed = dayjs.tz(dateStr, 'America/Los_Angeles');
  return parsed.isValid() ? parsed.toDate() : new Date();
}

/**
 * Normalize API incident to our internal format
 */
function normalizeIncident(raw: RSOApiIncident): NormalizedIncident {
  const incident_id = raw.cd_Inc_ID?.trim() || '';
  const call_type = raw.cd_Call_Type?.trim() || '';
  const received_at = parseDate(raw.cd_Received);

  // Filter out undefined addresses
  const address_raw = raw.cd_Address && !raw.cd_Address.match(/undefined/i)
    ? raw.cd_Address.trim()
    : null;

  const area = raw.cd_Area?.trim() || null;
  const disposition = raw.cd_Disposition?.trim() || null;

  const { category, priority } = classify(call_type);

  return {
    incident_id,
    call_type,
    call_category: category,
    priority,
    received_at: received_at.toISOString(),
    address_raw,
    area,
    disposition
  };
}

/**
 * Fetch incidents from the RSO JSON API
 *
 * @param options.pageSize - Number of incidents per page (default: 1000)
 * @param options.pageNumber - Page number (default: 1)
 * @param options.station - Filter by station code (optional)
 * @returns Array of normalized incidents
 */
export async function fetchIncidents(options: {
  pageSize?: number;
  pageNumber?: number;
  station?: string;
} = {}): Promise<NormalizedIncident[]> {
  const {
    pageSize = 1000,
    pageNumber = 1,
    station = ''
  } = options;

  const url = new URL(BASE_URL);
  url.searchParams.set('PageSize', String(pageSize));
  url.searchParams.set('PageNumber', String(pageNumber));
  url.searchParams.set('Cd_Station', station);

  console.log('[PRESSACCESS_CLIENT] Fetching:', url.toString());
  console.log('[PRESSACCESS_CLIENT] Request options:', {
    pageSize,
    pageNumber,
    station
  });

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://publicaccess.riversidesheriff.org/',
        'Origin': 'https://publicaccess.riversidesheriff.org',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
      },
      // Allow Next.js to cache upstream for short bursts
      // while still keeping the route response fresh via s-maxage
      next: { revalidate: Number(process.env.CACHE_TTL_SECONDS || 60) }
    });

    let hdrDump: Record<string, string> = {};
    try {
      const maybeHeaders: any = (res as any).headers;
      if (maybeHeaders?.entries) hdrDump = Object.fromEntries(maybeHeaders.entries());
    } catch {}
    console.log('[PRESSACCESS_CLIENT] Response status:', (res as any).status, (res as any).statusText);
    console.log('[PRESSACCESS_CLIENT] Response headers:', hdrDump);

    if (!res.ok) {
      let text = '';
      try { text = await (res as any).text?.(); } catch {}
      if (text) console.error('[PRESSACCESS_CLIENT] Error response body:', text.slice(0, 500));
      throw new Error(`HTTP ${(res as any).status}: ${(res as any).statusText}`);
    }

    const data: RSOApiIncident[] = await res.json();

    if (!Array.isArray(data)) {
      console.error('[PRESSACCESS_CLIENT] Response is not an array:', typeof data);
      throw new Error('API response is not an array');
    }

    console.log('[PRESSACCESS_CLIENT] Fetched', data.length, 'incidents');
    if (data.length > 0) {
      console.log('[PRESSACCESS_CLIENT] First incident sample:', data[0]);
    }

    const normalized = data
      .map(normalizeIncident)
      .filter(inc => inc.incident_id);

    console.log('[PRESSACCESS_CLIENT] After normalization:', normalized.length, 'incidents');

    return normalized;
  } catch (error: any) {
    console.error('[PRESSACCESS_CLIENT] Error:', error.message);
    console.error('[PRESSACCESS_CLIENT] Error stack:', error.stack);
    throw error;
  }
}

/**
 * Fetch incidents until we satisfy a time range requirement
 * Stops fetching when we get incidents older than the cutoff date
 *
 * @param sinceDate - Only fetch incidents newer than this date (ISO string)
 * @param maxPages - Maximum pages to fetch as safety limit (default: 10)
 * @param pageSize - Incidents per page (default: 1000)
 * @returns Array of normalized incidents within the time range
 */
export async function fetchIncidentsUntil(
  sinceDate?: string,
  maxPages = 10,
  pageSize = 1000,
  station?: string
): Promise<NormalizedIncident[]> {
  const allIncidents: NormalizedIncident[] = [];
  const cutoffTime = sinceDate ? new Date(sinceDate).getTime() : 0;

  console.log('[PRESSACCESS_CLIENT] Fetching with time filter:', {
    since: sinceDate,
    cutoffTime: cutoffTime ? new Date(cutoffTime).toISOString() : 'none',
    maxPages,
    pageSize
  });

  for (let page = 1; page <= maxPages; page++) {
    try {
      const incidents = await fetchIncidents({ pageSize, pageNumber: page, station });

      if (incidents.length === 0) {
        console.log(`[PRESSACCESS_CLIENT] Page ${page}: No more data`);
        break;
      }

      console.log(`[PRESSACCESS_CLIENT] Page ${page}: Got ${incidents.length} incidents`);

      // If we have a time filter, check if we've gone past the cutoff
      let foundOlderIncidents = false;

      for (const incident of incidents) {
        const incidentTime = new Date(incident.received_at).getTime();

        if (cutoffTime && incidentTime < cutoffTime) {
          foundOlderIncidents = true;
          console.log(`[PRESSACCESS_CLIENT] Page ${page}: Found incident older than cutoff, stopping`);
          break;
        }

        allIncidents.push(incident);
      }

      // If we found incidents older than our cutoff, stop fetching
      if (foundOlderIncidents) {
        break;
      }

      // If we got less than a full page, we've reached the end
      if (incidents.length < pageSize) {
        console.log(`[PRESSACCESS_CLIENT] Page ${page}: Last page (${incidents.length} < ${pageSize})`);
        break;
      }
    } catch (error) {
      console.error(`[PRESSACCESS_CLIENT] Failed to fetch page ${page}:`, error);
      break;
    }
  }

  console.log('[PRESSACCESS_CLIENT] Total fetched:', allIncidents.length, 'incidents within time range');
  return allIncidents;
}

/**
 * Fetch all incidents across multiple pages (legacy function)
 * @deprecated Use fetchIncidentsUntil for time-aware fetching
 */
export async function fetchAllIncidents(maxPages = 5, pageSize = 1000): Promise<NormalizedIncident[]> {
  return fetchIncidentsUntil(undefined, maxPages, pageSize);
}
