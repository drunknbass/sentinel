import type { Item as IncidentItem } from '../scrape';

export type IncidentFilters = {
  since?: string | Date;
  until?: string | Date;
  area?: string;
  callCategory?: string;
  callType?: string;
  minPriority?: number;
  q?: string;
  bbox?: [number, number, number, number];
  geocode?: boolean;
  limit?: number;
  station?: string;
};

export type IncidentsResponse = {
  count: number;
  items: IncidentItem[];
};

export type FetchIncidentsOptions = {
  /**
   * Optional base URL. Defaults to relative `/api/incidents` when omitted.
   * e.g. https://rso-pressaccess.vercel.app
   */
  baseUrl?: string;
  /**
   * Optional AbortSignal for cancelable requests.
   */
  signal?: AbortSignal;
  /**
   * Additional RequestInit overrides (headers merge shallowly).
   */
  init?: RequestInit;
};

const INCIDENTS_PATH = '/api/incidents';

const toIsoString = (value?: string | Date) => {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const buildQuery = (filters: IncidentFilters) => {
  const params = new URLSearchParams();

  const since = toIsoString(filters.since);
  const until = toIsoString(filters.until);
  if (since) params.set('since', since);
  if (until) params.set('until', until);

  if (filters.area) params.set('area', filters.area);
  if (filters.callCategory) params.set('callCategory', filters.callCategory);
  if (filters.callType) params.set('callType', filters.callType);
  if (typeof filters.minPriority === 'number') params.set('minPriority', String(filters.minPriority));
  if (filters.q) params.set('q', filters.q);
  if (typeof filters.limit === 'number') params.set('limit', String(filters.limit));
  if (filters.geocode) params.set('geocode', '1');
  if (filters.bbox?.length === 4) params.set('bbox', filters.bbox.join(','));
  if (filters.station) params.set('station', filters.station);

  return params.toString();
};

const joinUrl = (baseUrl?: string) => {
  if (!baseUrl) return INCIDENTS_PATH;
  const trimmed = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${trimmed}${INCIDENTS_PATH}`;
};

export async function fetchIncidents(
  filters: IncidentFilters = {},
  options: FetchIncidentsOptions = {}
): Promise<IncidentsResponse> {
  const query = buildQuery(filters);
  const base = joinUrl(options.baseUrl);
  const url = query ? `${base}?${query}` : base;

  console.log('[FETCH_INCIDENTS] Building request:', {
    filters,
    baseUrl: options.baseUrl,
    finalUrl: url
  });

  const headers = {
    Accept: 'application/json',
    ...(options.init?.headers instanceof Headers
      ? Object.fromEntries(options.init.headers.entries())
      : (options.init?.headers as Record<string, string> | undefined))
  };

  console.log('[FETCH_INCIDENTS] Fetching:', url);

  const res = await fetch(url, {
    method: 'GET',
    ...options.init,
    headers,
    signal: options.signal
  });

  let headerDump: Record<string, string> = {};
  try {
    // Some test doubles won't implement Headers; guard accordingly
    const maybeHeaders: any = (res as any).headers;
    if (maybeHeaders?.entries) {
      headerDump = Object.fromEntries(maybeHeaders.entries());
    }
  } catch {}

  console.log('[FETCH_INCIDENTS] Response:', {
    status: (res as any).status,
    statusText: (res as any).statusText,
    ok: (res as any).ok,
    headers: headerDump
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    console.error('[FETCH_INCIDENTS] Error response:', text.slice(0, 500));
    throw new Error(`Incidents request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as IncidentsResponse;
  console.log('[FETCH_INCIDENTS] Received data:', {
    count: data.count,
    itemsLength: data.items?.length
  });

  return data;
}
