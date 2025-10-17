// Test regional geocoding with the station information
import { geocodeOne, REGION_CENTROIDS } from './lib/geocode.js';

async function testRegionalGeocoding() {
  console.log('=== Testing Regional Geocoding ===\n');

  // Test case that was failing: Jurupa Valley incident
  const testCase = {
    incident_id: 'JV25289187',
    address: '1000 *** BLOCK N LYNN CI',
    area: 'JURUPA VALLEY',
    station: 'jurupa'
  };

  console.log('Test Case:', testCase);
  console.log('\nRegional centroids available:', Object.keys(REGION_CENTROIDS));

  // Test with station info
  console.log('\n1. Testing WITH station info (jurupa):');
  const resultWithStation = await geocodeOne(
    testCase.address,
    testCase.area,
    true,  // nocache
    testCase.station
  );
  console.log('Result:', resultWithStation);

  // Test without station info for comparison
  console.log('\n2. Testing WITHOUT station info:');
  const resultWithoutStation = await geocodeOne(
    testCase.address,
    testCase.area,
    true  // nocache
  );
  console.log('Result:', resultWithoutStation);

  // Test a Temecula incident
  console.log('\n3. Testing Temecula incident:');
  const temecCase = {
    address: '4100 *** BLOCK COUNTY CENTER DR',
    area: 'TEMECULA',
    station: 'southwest'
  };

  const temecResult = await geocodeOne(
    temecCase.address,
    temecCase.area,
    true,
    temecCase.station
  );
  console.log('Temecula result:', temecResult);

  // Test with raw data to see what's available
  console.log('\n4. Testing to see raw data from API:');
  try {
    const { fetchIncidents } = await import('./lib/sources/pressaccess-client.js');
    const incidents = await fetchIncidents({ pageSize: 5 });

    if (incidents.length > 0) {
      console.log('\nFirst incident raw_data sample:');
      const first = incidents[0];
      if (first.raw_data) {
        console.log('Available fields:', Object.keys(first.raw_data));
        console.log('Station:', first.station);
        console.log('Division:', first.division);
        console.log('Full raw data:', JSON.stringify(first.raw_data, null, 2));
      }
    }
  } catch (err) {
    console.error('Failed to fetch incidents:', err.message);
  }
}

testRegionalGeocoding().catch(console.error);