// Test Apple Maps with both Temecula and Jurupa Valley incidents
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
dotenv.config();

async function getAccessToken() {
  const teamId = process.env.APPLE_MAPKIT_TEAM_ID;
  const keyId = process.env.APPLE_MAPKIT_KEY_ID;
  const privateKey = process.env.APPLE_MAPKIT_PRIVATE_KEY;

  if (!teamId || !keyId || !privateKey) {
    console.error('Missing credentials');
    return null;
  }

  try {
    // Generate JWT auth token
    const authToken = jwt.sign(
      {
        iss: teamId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
      },
      privateKey,
      {
        algorithm: 'ES256',
        keyid: keyId,
      }
    );

    // Exchange for access token
    const tokenUrl = 'https://maps-api.apple.com/v1/token';
    const tokenResponse = await fetch(tokenUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      }
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      return null;
    }

    const tokenData = await tokenResponse.json();
    return tokenData.accessToken;
  } catch (err) {
    console.error('Error getting token:', err);
    return null;
  }
}

async function testIncidents() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    console.error('Failed to get access token');
    return;
  }

  console.log('✅ Got access token\n');

  // Test cases matching the actual incidents
  const testCases = [
    {
      incident_id: 'TE25289198',
      address: '4100 *** BLOCK COUNTY CENTER DR',
      area: 'TEMECULA',
      expectedUrl: 'https://maps-api.apple.com/v1/geocode?q=4100%20***%20BLOCK%20COUNTY%20CENTER%20DR%2C%20TEMECULA'
    },
    {
      incident_id: 'JV25289187',
      address: '1000 *** BLOCK N LYNN CI',
      area: 'JURUPA VALLEY',
      expectedUrl: 'https://maps-api.apple.com/v1/geocode?q=1000%20***%20BLOCK%20N%20LYNN%20CI%2C%20JURUPA%20VALLEY'
    }
  ];

  const userLocation = '33.7175,-115.4734'; // Riverside County center

  for (const test of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${test.incident_id}`);
    console.log(`Address: ${test.address}`);
    console.log(`Area: ${test.area}`);

    // Build query exactly as our code does
    const q = `${test.address}, ${test.area}`;

    const url = new URL('https://maps-api.apple.com/v1/geocode');
    url.searchParams.append('q', q);
    url.searchParams.append('limitToCountries', 'US');
    url.searchParams.append('userLocation', userLocation);

    console.log('\nQuery string:', q);
    console.log('Full URL:', url.toString());

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      console.log('\nResponse:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          console.log('✅ SUCCESS! Found location:', {
            lat: result.coordinate?.latitude,
            lon: result.coordinate?.longitude,
            displayName: result.displayName || result.formattedAddressLines?.join(', ')
          });
        } else {
          console.log('❌ No results found');
          console.log('Response:', JSON.stringify(data, null, 2));
        }
      } else {
        const error = await response.text();
        console.log('❌ Error:', error);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }

  // Also test without comma between address and area
  console.log(`\n${'='.repeat(60)}`);
  console.log('Testing alternate query format (no comma):');

  for (const test of testCases) {
    const qNoComma = `${test.address} ${test.area}`;
    console.log(`\n${test.incident_id}: "${qNoComma}"`);

    const url = new URL('https://maps-api.apple.com/v1/geocode');
    url.searchParams.append('q', qNoComma);
    url.searchParams.append('limitToCountries', 'US');
    url.searchParams.append('userLocation', userLocation);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        console.log('✅ Works without comma too');
      } else {
        console.log('❌ No results without comma');
      }
    }
  }
}

testIncidents();