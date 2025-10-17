// Test our area coverage with actual incidents
import { AREA_COORDINATES } from './lib/geocode.js';

async function testAreaCoverage() {
  console.log('=== Riverside County Area Coverage ===\n');

  // Count our areas
  const areaNames = Object.keys(AREA_COORDINATES);
  console.log(`Total areas configured: ${areaNames.length}`);

  // Separate by type
  const cities = [
    'CORONA', 'EASTVALE', 'JURUPA VALLEY', 'NORCO', 'RIVERSIDE',
    'MORENO VALLEY', 'PERRIS', 'MENIFEE', 'CANYON LAKE', 'LAKE ELSINORE',
    'WILDOMAR', 'MURRIETA', 'TEMECULA', 'HEMET', 'SAN JACINTO',
    'BEAUMONT', 'BANNING', 'CALIMESA', 'PALM SPRINGS', 'CATHEDRAL CITY',
    'RANCHO MIRAGE', 'PALM DESERT', 'INDIAN WELLS', 'LA QUINTA', 'INDIO',
    'COACHELLA', 'DESERT HOT SPRINGS', 'BLYTHE'
  ];

  const incorporated = areaNames.filter(name => cities.includes(name));
  const unincorporated = areaNames.filter(name => !cities.includes(name));

  console.log(`Incorporated cities: ${incorporated.length}`);
  console.log(`Unincorporated areas: ${unincorporated.length}`);

  // Now fetch recent incidents and see how many match our areas
  console.log('\n=== Testing Coverage Against Recent Incidents ===\n');

  const { fetchIncidents } = await import('./lib/sources/pressaccess-client.js');

  try {
    const incidents = await fetchIncidents({ pageSize: 500, pageNumber: 1 });

    // Check how many incidents have areas we recognize
    const areasInIncidents = new Set();
    const unmatchedAreas = new Set();
    let matchCount = 0;
    let unmatchedCount = 0;

    incidents.forEach(incident => {
      if (incident.area) {
        const areaUpper = incident.area.toUpperCase().trim();
        if (AREA_COORDINATES[areaUpper]) {
          areasInIncidents.add(areaUpper);
          matchCount++;
        } else {
          unmatchedAreas.add(incident.area);
          unmatchedCount++;
        }
      }
    });

    console.log(`Total incidents: ${incidents.length}`);
    console.log(`Incidents with areas: ${matchCount + unmatchedCount}`);
    console.log(`Matched to our coordinates: ${matchCount} (${((matchCount / (matchCount + unmatchedCount)) * 100).toFixed(1)}%)`);
    console.log(`Unmatched: ${unmatchedCount}`);

    console.log('\n=== Areas Found in Incidents ===');
    console.log(`Unique areas matched: ${areasInIncidents.size}`);
    console.log([...areasInIncidents].sort().join(', '));

    if (unmatchedAreas.size > 0) {
      console.log('\n=== Areas NOT in Our Database ===');
      console.log('These areas appeared in incidents but we don\'t have coordinates:');
      console.log([...unmatchedAreas].sort().join(', '));
    }

    // Show geographic distribution
    console.log('\n=== Geographic Distribution ===');
    const regions = {
      western: [],
      central: [],
      desert: [],
      mountain: []
    };

    areaNames.forEach(area => {
      const coord = AREA_COORDINATES[area];
      if (coord.lon < -117.3) {
        regions.western.push(area);
      } else if (coord.lon < -116.7) {
        regions.central.push(area);
      } else if (coord.lat > 33.6 && coord.lon < -116.0) {
        regions.desert.push(area);
      } else if (coord.lon > -116.8 && coord.lat < 33.8) {
        regions.mountain.push(area);
      }
    });

    console.log(`Western region: ${regions.western.length} areas`);
    console.log(`Central region: ${regions.central.length} areas`);
    console.log(`Desert region: ${regions.desert.length} areas`);
    console.log(`Mountain region: ${regions.mountain.length} areas`);

  } catch (err) {
    console.error('Error fetching incidents:', err.message);
  }
}

testAreaCoverage().catch(console.error);