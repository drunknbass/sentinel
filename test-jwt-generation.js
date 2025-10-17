// Test our JWT generation matches Apple's format
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

// Decode the working token to compare
const workingToken = 'eyJraWQiOiJKUDNDQjQzRFUyIiwidHlwIjoiSldUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJTS1c5N1I2MzRNIiwiaWF0IjoxNzYwNjQ4NzM1LCJleHAiOjE3NjEyODkxOTl9.IZIezMgJRGG5Eevt4qrlqP-iOUet7w_cSTgRB3P8iJrYmsvjuL1npJ7dx2No-wzU9-sms6Gw4uPvmmXf6G-Yow';

console.log('=== WORKING TOKEN STRUCTURE ===');
const parts = workingToken.split('.');
const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

console.log('Header:', JSON.stringify(header, null, 2));
console.log('Payload:', JSON.stringify(payload, null, 2));

// Header shows: kid: "JP3CB43DU2" (this is APPLE_MAPKIT_KEY_ID)
// Payload shows: iss: "SKW97R634M" (this is APPLE_MAPKIT_TEAM_ID)

console.log('\n=== OUR JWT GENERATION ===');
const teamId = process.env.APPLE_MAPKIT_TEAM_ID;
const keyId = process.env.APPLE_MAPKIT_KEY_ID;
const privateKey = process.env.APPLE_MAPKIT_PRIVATE_KEY;

console.log('Team ID from env:', teamId);
console.log('Key ID from env:', keyId);
console.log('Private key exists:', !!privateKey);

if (privateKey) {
  console.log('Private key starts with:', privateKey.substring(0, 50));
  console.log('Private key ends with:', privateKey.substring(privateKey.length - 50));
}

// Try to generate our token
try {
  const ourToken = jwt.sign(
    {
      iss: teamId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days like Apple's
    },
    privateKey,
    {
      algorithm: 'ES256',
      keyid: keyId,
    }
  );

  console.log('\n✅ Successfully generated JWT!');
  console.log('Our token:', ourToken);

  // Decode our token
  const ourParts = ourToken.split('.');
  const ourHeader = JSON.parse(Buffer.from(ourParts[0], 'base64').toString());
  const ourPayload = JSON.parse(Buffer.from(ourParts[1], 'base64').toString());

  console.log('\nOur Header:', JSON.stringify(ourHeader, null, 2));
  console.log('Our Payload:', JSON.stringify(ourPayload, null, 2));

  // Test with Apple Maps
  console.log('\n=== TESTING WITH OUR GENERATED TOKEN ===');
  testWithToken(ourToken);

} catch (err) {
  console.error('\n❌ Failed to generate JWT:', err.message);
  console.error('Error details:', err);
}

async function testWithToken(token) {
  const url = new URL('https://maps-api.apple.com/v1/geocode');
  url.searchParams.append('q', '4100 *** BLOCK COUNTY CENTER DR, TEMECULA, Riverside County, CA');
  url.searchParams.append('limitToCountries', 'US');
  url.searchParams.append('userLocation', '33.7175,-115.4734');

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    console.log('Apple Maps API Response:', res.status, res.statusText);

    if (res.ok) {
      const data = await res.json();
      console.log('✅ SUCCESS! Got response:', JSON.stringify(data.results?.[0]?.coordinate, null, 2));
    } else {
      const text = await res.text();
      console.log('❌ Error response:', text);
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}