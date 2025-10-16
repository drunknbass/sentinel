import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { sharedCache } from '../lib/cache';
import { scrapeIncidents } from '../lib/scrape';

const fixturePath = resolve(__dirname, './fixtures/pressaccess.html');
const fixtureHtml = readFileSync(fixturePath, 'utf-8');

const htmlResponse = {
  ok: true,
  text: async () => fixtureHtml
} as any;

const geocodeResponse = {
  ok: true,
  json: async () => ({
    result: {
      addressMatches: [
        {
          coordinates: { y: 33.909, x: -117.547 }
        }
      ]
    }
  })
} as any;

describe('scrapeIncidents', () => {
  beforeEach(() => {
    sharedCache.clear();
    process.env.GEOCODE_ENABLED = 'false';
  });

  it('parses incidents, normalizes headers, and classifies priorities', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(htmlResponse);

    const incidents = await scrapeIncidents({ geocode: false });

    expect(incidents).toHaveLength(3);
    expect(incidents[0]).toMatchObject({
      incident_id: 'RG240000123',
      call_type: 'Armed Robbery',
      call_category: 'violent',
      priority: 10,
      address_raw: '1200 Main St',
      area: 'CITY OF NORCO',
      disposition: 'Active'
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('embeds geocode results when enabled', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockImplementation(async (input: any) => {
      if (typeof input === 'string' && input.includes('pressaccess')) {
        return htmlResponse;
      }
      return geocodeResponse;
    });
    process.env.GEOCODE_ENABLED = 'true';

    const incidents = await scrapeIncidents({ geocode: true });

    expect(incidents[0].lat).toBeCloseTo(33.909);
    expect(incidents[0].lon).toBeCloseTo(-117.547);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
