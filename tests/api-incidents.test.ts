import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NextRequest } from 'next/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { sharedCache } from '../lib/cache';
import { GET } from '../app/api/incidents/route';

const fixturePath = resolve(__dirname, './fixtures/pressaccess.html');
const fixtureHtml = readFileSync(fixturePath, 'utf-8');

const htmlResponse = {
  ok: true,
  text: async () => fixtureHtml
} as any;

describe('GET /api/incidents', () => {
  beforeEach(() => {
    sharedCache.clear();
    vi.mocked(global.fetch).mockResolvedValue(htmlResponse);
  });

  it('returns filtered incidents according to query params', async () => {
    const request = new NextRequest('https://example.com/api/incidents?callCategory=violent&minPriority=40');
    const response = await GET(request);
    const payload = await response.json();

    expect(payload.count).toBe(1);
    expect(payload.items[0]).toMatchObject({
      incident_id: 'RG240000123',
      call_category: 'violent'
    });
  });

  it('limits results and applies text search', async () => {
    const request = new NextRequest('https://example.com/api/incidents?q=Traffic');
    const response = await GET(request);
    const payload = await response.json();

    expect(payload.count).toBe(1);
    expect(payload.items[0]).toMatchObject({
      incident_id: 'RG240000124',
      call_type: 'Traffic Collision'
    });
  });
});
