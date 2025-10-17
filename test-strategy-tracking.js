// Test geocoding strategy and centroid tracking
import dotenv from 'dotenv';
dotenv.config();

async function testStrategyTracking() {
  console.log('=== Testing Geocoding Strategy & Centroid Tracking ===\n');

  // Set up Apple Maps auth
  process.env.APPLE_MAPKIT_TEAM_ID = process.env.APPLE_MAPKIT_TEAM_ID || '';
  process.env.APPLE_MAPKIT_KEY_ID = process.env.APPLE_MAPKIT_KEY_ID || '';
  process.env.APPLE_MAPKIT_PRIVATE_KEY = process.env.APPLE_MAPKIT_PRIVATE_KEY || '';

  const { scrapeIncidents } = await import('./lib/scrape.js');

  try {
    console.log('Fetching last 1 hour of incidents with geocoding...\n');

    const items = await scrapeIncidents({
      geocode: true,
      since: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Last 1 hour
      maxGeocode: 50,
      geocodeConcurrency: 3,
      nocache: true,
      onProgress: (stage, current, total) => {
        if (stage === 'Geocoding') {
          console.log(`[PROGRESS] ${stage}: ${current}/${total}`);
        }
      }
    });

    console.log('\n=== Results Analysis ===\n');

    // Count strategies used
    const strategies = {};
    const centroids = {};
    const centroidByStrategy = {};

    items.forEach(item => {
      if (item.geocode_strategy && item.lat !== null) {
        strategies[item.geocode_strategy] = (strategies[item.geocode_strategy] || 0) + 1;

        if (item.geocode_centroid) {
          centroids[item.geocode_centroid] = (centroids[item.geocode_centroid] || 0) + 1;

          // Track which centroids work with which strategies
          const key = `${item.geocode_strategy}+${item.geocode_centroid}`;
          centroidByStrategy[key] = (centroidByStrategy[key] || 0) + 1;
        }
      }
    });

    console.log('Geocoding Strategies Used:');
    Object.entries(strategies).forEach(([strategy, count]) => {
      console.log(`  ${strategy}: ${count} successful`);
    });

    console.log('\nCentroids That Worked:');
    Object.entries(centroids).forEach(([centroid, count]) => {
      console.log(`  ${centroid}: ${count} successful`);
    });

    console.log('\nStrategy + Centroid Combinations:');
    Object.entries(centroidByStrategy)
      .sort((a, b) => b[1] - a[1])
      .forEach(([combo, count]) => {
        const [strategy, centroid] = combo.split('+');
        console.log(`  ${strategy} with ${centroid}: ${count}`);
      });

    // Show some examples
    console.log('\n=== Example Geocoded Items ===\n');
    const geocoded = items.filter(i => i.lat !== null && i.geocode_strategy);
    geocoded.slice(0, 3).forEach(item => {
      console.log(`${item.incident_id} in ${item.area}:`);
      console.log(`  Address: ${item.address_raw}`);
      console.log(`  Location: ${item.lat}, ${item.lon}`);
      console.log(`  Strategy: ${item.geocode_strategy}`);
      console.log(`  Centroid: ${item.geocode_centroid || 'none'}`);
      console.log(`  Approximate: ${item.location_approximate || false}`);
      console.log('');
    });

    // Show regional distribution
    const regionCounts = {};
    items.forEach(item => {
      if (item.station) {
        regionCounts[item.station] = (regionCounts[item.station] || 0) + 1;
      }
    });

    console.log('=== Regional Distribution ===');
    Object.entries(regionCounts).forEach(([region, count]) => {
      console.log(`  ${region}: ${count} incidents`);
    });

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  }
}

testStrategyTracking().catch(console.error);