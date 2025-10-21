import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchIncidents } from '../../lib/api/incidents';

const incidentsPayload = {
  count: 1,
  items: [
    {
      incident_id: 'RG240000999',
      call_type: 'Robbery',
      call_category: 'violent',
      priority: 10,
      received_at: '2025-10-15T12:00:00.000Z',
      address_raw: '123 Main St',
      area: 'CITY OF RIVERSIDE',
      disposition: 'Active',
      lat: null,
      lon: null
    }
  ]
};

describe('fetchIncidents client abstraction', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
  });

  it('builds query strings from filters and returns parsed payload', async () => {
    const fetchSpy = vi
      .mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => incidentsPayload
      } as any);

    const result = await fetchIncidents(
      {
        since: new Date('2025-10-14T00:00:00Z'),
        area: 'CITY OF NORCO',
        geocode: true,
        minPriority: 40,
        bbox: [-117.7, 33.5, -116.8, 34.1]
      },
      { baseUrl: 'https://example.com' }
    );

    expect(result).toEqual(incidentsPayload);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain('/api/incidents?');
    expect(url).toContain('area=CITY+OF+NORCO');
    expect(url).toContain('geocode=1');
    expect(url).toContain('minPriority=40');
    expect(url).toContain('bbox=-117.7%2C33.5%2C-116.8%2C34.1');
  });

  it('throws with detailed message when response is not ok', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Error'
    } as any);

    await expect(fetchIncidents()).rejects.toThrow(
      /Incidents request failed \(500\): Internal Error/
    );
  });
});
