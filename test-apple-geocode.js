// Test Apple Maps geocoding locally
require('dotenv').config();

const jwt = require('jsonwebtoken');

// Generate Apple Maps JWT token
function generateAppleMapsToken() {
  const teamId = process.env.APPLE_MAPKIT_TEAM_ID;
  const keyId = process.env.APPLE_MAPKIT_KEY_ID;
  const privateKey = process.env.APPLE_MAPKIT_PRIVATE_KEY;

  if (!teamId || !keyId || !privateKey) {
    console.error('Missing Apple MapKit credentials');
    console.log('APPLE_MAPKIT_TEAM_ID:', teamId ? 'SET' : 'MISSING');
    console.log('APPLE_MAPKIT_KEY_ID:', keyId ? 'SET' : 'MISSING');
    console.log('APPLE_MAPKIT_PRIVATE_KEY:', privateKey ? 'SET' : 'MISSING');
    return null;
  }

  try {
    const token = jwt.sign(
      {
        iss: teamId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
      },
      privateKey,
      {
        algorithm: 'ES256',
        keyid: keyId,
      }
    );

    return token;
  } catch (err) {
    console.error('Failed to generate JWT token:', err.message);
    return null;
  }
}

// Test geocoding function
async function testAppleMapsGeocode(address, area) {
  console.log('\n=== Testing Apple Maps Geocoding ===');
  console.log('Address:', address);
  console.log('Area:', area);

  const token = generateAppleMapsToken();
  if (!token) {
    console.error('Failed to generate token');
    return;
  }

  console.log('Token generated successfully');

  // Construct the query
  const q = `${address}${area ? `, ${area}` : ''}, Riverside County, CA`;

  // Riverside County center as user location
  const userLocation = '33.7175,-115.4734';

  const url = new URL('https://maps-api.apple.com/v1/geocode');
  url.searchParams.append('q', q);
  url.searchParams.append('limitToCountries', 'US');
  url.searchParams.append('userLocation', userLocation);

  console.log('\nRequest URL:', url.toString());

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    console.log('Response status:', res.status, res.statusText);

    if (!res.ok) {
      const text = await res.text();
      console.error('Error response:', text);
      return null;
    }

    const data = await res.json();
    console.log('\nFull response:', JSON.stringify(data, null, 2));

    if (data?.results && data.results.length > 0) {
      const result = data.results[0];
      const lat = result.coordinate?.latitude;
      const lon = result.coordinate?.longitude;

      if (lat && lon) {
        console.log('\n✅ SUCCESS! Geocoded to:', { lat, lon });
        console.log('Display name:', result.displayName);
        return { lat, lon };
      }
    }

    console.log('❌ No results found');
    return null;
  } catch (err) {
    console.error('Fetch error:', err);
    return null;
  }
}

// Test the specific Temecula address
async function runTests() {
  console.log('Environment check:');
  console.log('NODE_ENV:', process.env.NODE_ENV);

  // Test the specific address that should work
  await testAppleMapsGeocode('4100 *** BLOCK COUNTY CENTER DR', 'TEMECULA');

  // Test a few more addresses
  await testAppleMapsGeocode('1800 *** BLOCK COLLIER AV', 'LAKE ELSINORE');
  await testAppleMapsGeocode('2600 *** BLOCK AMANDA AV', 'MORENO VALLEY');
}

runTests().catch(console.error);