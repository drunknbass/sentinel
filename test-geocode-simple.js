// Simple test using direct API calls
const address = '4100 *** BLOCK COUNTY CENTER DR';
const area = 'TEMECULA';

async function testDirectGeocoders() {
  console.log('Testing geocoding for:', address, area);

  // Test Census directly
  console.log('\n=== Testing Census Bureau ===');
  const censusUrl = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(
    `4100 COUNTY CENTER DR, ${area}, Riverside County, CA`
  )}&benchmark=Public_AR_Current&format=json`;

  try {
    const res = await fetch(censusUrl);
    const data = await res.json();
    console.log('Census response:', JSON.stringify(data?.result?.addressMatches?.[0]?.coordinates, null, 2));
  } catch (err) {
    console.error('Census error:', err.message);
  }

  // Test Nominatim directly
  console.log('\n=== Testing OpenStreetMap Nominatim ===');
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    `4100 COUNTY CENTER DR, ${area}, Riverside County, CA`
  )}&limit=1`;

  try {
    const res = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Test/1.0'
      }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      console.log('Nominatim found:', {
        lat: data[0].lat,
        lon: data[0].lon,
        display: data[0].display_name
      });
    } else {
      console.log('Nominatim: No results');
    }
  } catch (err) {
    console.error('Nominatim error:', err.message);
  }
}

testDirectGeocoders();