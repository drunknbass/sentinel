// Test Apple Maps with the provided working token
const testToken = 'eyJraWQiOiJKUDNDQjQzRFUyIiwidHlwIjoiSldUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJTS1c5N1I2MzRNIiwiaWF0IjoxNzYwNjQ4NzM1LCJleHAiOjE3NjEyODkxOTl9.IZIezMgJRGG5Eevt4qrlqP-iOUet7w_cSTgRB3P8iJrYmsvjuL1npJ7dx2No-wzU9-sms6Gw4uPvmmXf6G-Yow';

// Decode the token to see its structure
function decodeToken(token) {
  const parts = token.split('.');
  const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

  console.log('Token Header:', header);
  console.log('Token Payload:', payload);
  console.log('Issued at:', new Date(payload.iat * 1000).toISOString());
  console.log('Expires at:', new Date(payload.exp * 1000).toISOString());

  return { header, payload };
}

// Test geocoding function
async function testAppleMapsGeocode(address, area, token) {
  console.log('\n=== Testing Apple Maps Geocoding ===');
  console.log('Address:', address);
  console.log('Area:', area);

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

// Run the test
async function runTest() {
  console.log('Decoding provided token:');
  const tokenInfo = decodeToken(testToken);

  // Test the specific Temecula address that should work
  const result = await testAppleMapsGeocode('4100 *** BLOCK COUNTY CENTER DR', 'TEMECULA', testToken);

  if (result) {
    console.log('\n🎉 Successfully geocoded the Temecula address!');
    console.log('This confirms Apple Maps API is working with the provided token.');
  }
}

runTest().catch(console.error);