// Test Apple Maps geocoding for the specific Temecula address
import dotenv from 'dotenv';
dotenv.config();

async function testAppleMapsDirectly() {
  // The token that should be working
  const token = 'eyJraWQiOiJKUDNDQjQzRFUyIiwidHlwIjoiSldUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJTS1c5N1I2MzRNIiwiaWF0IjoxNzYwNjQ4NzM1LCJleHAiOjE3NjEyODkxOTl9.IZIezMgJRGG5Eevt4qrlqP-iOUet7w_cSTgRB3P8iJrYmsvjuL1npJ7dx2No-wzU9-sms6Gw4uPvmmXf6G-Yow';

  // Test addresses
  const tests = [
    {
      address: '4100 *** BLOCK COUNTY CENTER DR',
      area: 'TEMECULA',
      id: 'TE25289198'
    },
    {
      address: '4100 COUNTY CENTER DR',
      area: 'TEMECULA',
      id: 'Without BLOCK'
    },
    {
      address: 'COUNTY CENTER DR',
      area: 'TEMECULA',
      id: 'Just street'
    }
  ];

  for (const test of tests) {
    console.log(`\n=== Testing: ${test.id} ===`);
    console.log(`Address: ${test.address}`);
    console.log(`Area: ${test.area}`);

    const q = `${test.address}, ${test.area}, Riverside County, CA`;
    const userLocation = '33.7175,-115.4734'; // Riverside County center

    const url = new URL('https://maps-api.apple.com/v1/geocode');
    url.searchParams.append('q', q);
    url.searchParams.append('limitToCountries', 'US');
    url.searchParams.append('userLocation', userLocation);

    console.log('Query:', q);
    console.log('URL:', url.toString());

    try {
      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      console.log('Response:', res.status, res.statusText);

      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          console.log('✅ Found:', {
            lat: result.coordinate?.latitude,
            lon: result.coordinate?.longitude,
            displayName: result.displayName
          });
        } else {
          console.log('❌ No results');
        }
      } else {
        const text = await res.text();
        console.log('❌ Error:', text);
      }
    } catch (err) {
      console.error('❌ Fetch error:', err.message);
    }
  }
}

testAppleMapsDirectly().catch(console.error);