// Test Apple Maps with proper token exchange
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
dotenv.config();

async function testAppleMapsWithTokenExchange() {
  const teamId = process.env.APPLE_MAPKIT_TEAM_ID;
  const keyId = process.env.APPLE_MAPKIT_KEY_ID;
  const privateKey = process.env.APPLE_MAPKIT_PRIVATE_KEY;

  if (!teamId || !keyId || !privateKey) {
    console.error('Missing credentials');
    return;
  }

  console.log('Team ID:', teamId);
  console.log('Key ID:', keyId);
  console.log('Private key exists:', !!privateKey);

  try {
    // Step 1: Generate JWT auth token
    console.log('\n=== Step 1: Generating JWT auth token ===');
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

    console.log('Auth token generated successfully');
    console.log('Token:', authToken.substring(0, 50) + '...');

    // Step 2: Exchange for access token
    console.log('\n=== Step 2: Exchanging for access token ===');
    const tokenUrl = 'https://maps-api.apple.com/v1/token';
    const tokenResponse = await fetch(tokenUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      }
    });

    console.log('Token exchange response:', tokenResponse.status, tokenResponse.statusText);

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      return;
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.accessToken;
    const expiresInSeconds = tokenData.expiresInSeconds;

    console.log('Access token received!');
    console.log('Expires in:', expiresInSeconds, 'seconds');
    console.log('Access token:', accessToken.substring(0, 50) + '...');

    // Step 3: Test geocoding with access token
    console.log('\n=== Step 3: Testing geocoding ===');
    const testCases = [
      {
        address: '4100 *** BLOCK COUNTY CENTER DR',
        area: 'TEMECULA',
        id: 'TE25289198'
      }
    ];

    for (const test of testCases) {
      console.log(`\nTesting: ${test.id}`);
      const q = `${test.address}, ${test.area}, Riverside County, CA`;
      const userLocation = '33.7175,-115.4734';

      const url = new URL('https://maps-api.apple.com/v1/geocode');
      url.searchParams.append('q', q);
      url.searchParams.append('limitToCountries', 'US');
      url.searchParams.append('userLocation', userLocation);

      console.log('Query:', q);

      const geoResponse = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      console.log('Geocoding response:', geoResponse.status, geoResponse.statusText);

      if (geoResponse.ok) {
        const data = await geoResponse.json();
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          console.log('✅ SUCCESS! Found location:', {
            lat: result.coordinate?.latitude,
            lon: result.coordinate?.longitude,
            displayName: result.displayName
          });
        } else {
          console.log('❌ No results found');
        }
      } else {
        const error = await geoResponse.text();
        console.log('❌ Geocoding error:', error);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testAppleMapsWithTokenExchange();