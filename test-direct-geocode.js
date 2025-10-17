// Test direct geocoding for the problematic Temecula address
import { geocodeOne } from './lib/geocode.js';

async function testGeocode() {
  console.log('Testing geocoding for Temecula incident TE25289198');
  console.log('Address: 4100 *** BLOCK COUNTY CENTER DR');
  console.log('Area: TEMECULA');
  console.log('');

  // Test WITH cache
  console.log('=== Test 1: WITH cache ===');
  const withCache = await geocodeOne('4100 *** BLOCK COUNTY CENTER DR', 'TEMECULA', false);
  console.log('Result with cache:', withCache);

  // Test WITHOUT cache
  console.log('\n=== Test 2: WITHOUT cache (nocache=true) ===');
  const noCache = await geocodeOne('4100 *** BLOCK COUNTY CENTER DR', 'TEMECULA', true);
  console.log('Result without cache:', noCache);

  // Force exit since we might have open connections
  process.exit(0);
}

testGeocode().catch(console.error);