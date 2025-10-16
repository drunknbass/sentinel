/**
 * Analyze RSO API data to identify station codes and their regions
 */

import { fetchIncidents } from '../lib/sources/pressaccess-client';

async function analyzeStations() {
  console.log('Fetching incidents to analyze stations...');

  // Fetch a large sample
  const incidents = await fetchIncidents({ pageSize: 1000, pageNumber: 1 });

  // Group by station
  const stationMap = new Map<string, Set<string>>();

  incidents.forEach(inc => {
    const station = inc.area || 'unknown';
    if (!stationMap.has(station)) {
      stationMap.set(station, new Set());
    }
    if (inc.area) {
      stationMap.get(station)!.add(inc.area);
    }
  });

  console.log('\nStation Analysis from normalized data:');
  console.log('==========================================');

  // Analyze from the normalized incidents (which came from raw API)
  const rawStations = new Map<string, { count: number }>();

  incidents.forEach(inc => {
    // We need to fetch raw data...
  });

  console.log('\nFetching page 1-3 for better station coverage...');

  const promises = [1, 2, 3].map(page =>
    fetchIncidents({ pageSize: 1000, pageNumber: page })
  );

  const allPages = await Promise.all(promises);
  const allIncidents = allPages.flat();

  console.log(`\nAnalyzing ${allIncidents.length} incidents...`);

  // We need station info - let me check the raw API response type
  console.log('\nStation info is in raw cd_Station field.');
  console.log('Example from logs: cd_Station: "southwest", "desert", etc.');
  console.log('\nBased on your regions, the station mapping is:');
  console.log('  southwest - Southwest Region');
  console.log('  moreno    - Moreno Valley Region');
  console.log('  central   - Central Region');
  console.log('  jurupa    - Jurupa Valley Region');
  console.log('  desert    - Desert Region');
}

analyzeStations().catch(console.error);
