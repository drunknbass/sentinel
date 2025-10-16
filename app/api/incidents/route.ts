import { NextRequest, NextResponse } from 'next/server';
import { scrapeIncidents } from '../../../lib/scrape';

export const runtime = 'nodejs';

type BBox = {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
};

const parseBbox = (raw?: string | null): BBox | null => {
  if (!raw) return null;
  const values = raw.split(',').map(Number);
  if (values.length !== 4 || values.some((val) => Number.isNaN(val))) return null;
  const [minLon, minLat, maxLon, maxLat] = values;
  return { minLon, minLat, maxLon, maxLat };
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const since = url.searchParams.get('since');
  const until = url.searchParams.get('until');
  const area = url.searchParams.get('area');
  const callCategory = url.searchParams.get('callCategory');
  const callType = url.searchParams.get('callType');
  const minPriority = Number(url.searchParams.get('minPriority') || 0);
  const q = url.searchParams.get('q');
  const bbox = parseBbox(url.searchParams.get('bbox'));
  const limit = Math.min(Number(url.searchParams.get('limit') || 1000), 3000);
  const withGeocode = ['1', 'true', 'yes'].includes((url.searchParams.get('geocode') || '').toLowerCase());

  try {
    const all = await scrapeIncidents({ geocode: withGeocode });
    const filtered = all.filter((item) => {
      if (since && new Date(item.received_at) < new Date(since)) return false;
      if (until && new Date(item.received_at) > new Date(until)) return false;
      if (area && item.area !== area) return false;
      if (callCategory && item.call_category !== callCategory) return false;
      if (callType && !item.call_type.toLowerCase().includes(callType.toLowerCase())) return false;
      if (minPriority && item.priority > minPriority) return false;
      if (q) {
        const needle = q.toLowerCase();
        const haystack = `${item.incident_id} ${item.address_raw ?? ''} ${item.call_type} ${item.area ?? ''}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });

    const limited = filtered.slice(0, limit);

    const spatial = bbox
      ? limited.filter(
          (item) =>
            typeof item.lon === 'number' &&
            typeof item.lat === 'number' &&
            item.lon! >= bbox.minLon &&
            item.lon! <= bbox.maxLon &&
            item.lat! >= bbox.minLat &&
            item.lat! <= bbox.maxLat
        )
      : limited;

    return NextResponse.json(
      { count: spatial.length, items: spatial },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
        }
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'scrape failed' }, { status: 500 });
  }
}
