// Test script to verify Apple Maps auth works with both PEM and base64 formats
import dotenv from 'dotenv';
dotenv.config();

async function testAppleAuth() {
  console.log('=== Testing Apple Maps Authentication Formats ===\n');

  // Save original key
  const originalKey = process.env.APPLE_MAPKIT_PRIVATE_KEY;

  if (!originalKey) {
    console.error('❌ No APPLE_MAPKIT_PRIVATE_KEY found in .env');
    console.log('\nPlease set up your .env file with:');
    console.log('APPLE_MAPKIT_TEAM_ID=your-team-id');
    console.log('APPLE_MAPKIT_KEY_ID=your-key-id');
    console.log('APPLE_MAPKIT_PRIVATE_KEY=your-private-key');
    return;
  }

  const { generateAppleMapsToken } = await import('./lib/apple-maps-auth.js');

  // Test 1: Original format (should be raw PEM)
  console.log('Test 1: Testing with original key from .env');
  console.log('Key preview:', originalKey.substring(0, 50).replace(/\n/g, '\\n') + '...\n');

  let token = await generateAppleMapsToken();
  if (token) {
    console.log('✅ Success with original format!');
    console.log('Token preview:', token.substring(0, 30) + '...\n');
  } else {
    console.log('❌ Failed with original format\n');
  }

  // Test 2: Base64 encoded version
  console.log('Test 2: Testing with base64-encoded key');
  const base64Key = Buffer.from(originalKey).toString('base64');
  process.env.APPLE_MAPKIT_PRIVATE_KEY = base64Key;
  console.log('Base64 preview:', base64Key.substring(0, 50) + '...\n');

  // Clear cache to force new token generation
  const authModule = await import('./lib/apple-maps-auth.js');
  authModule.cachedAccessToken = null;

  token = await generateAppleMapsToken();
  if (token) {
    console.log('✅ Success with base64 format!');
    console.log('Token preview:', token.substring(0, 30) + '...\n');
  } else {
    console.log('❌ Failed with base64 format\n');
  }

  // Test 3: With escaped newlines
  console.log('Test 3: Testing with escaped newlines');
  const escapedKey = originalKey.replace(/\n/g, '\\n');
  process.env.APPLE_MAPKIT_PRIVATE_KEY = escapedKey;
  console.log('Escaped preview:', escapedKey.substring(0, 50) + '...\n');

  authModule.cachedAccessToken = null;
  token = await generateAppleMapsToken();
  if (token) {
    console.log('✅ Success with escaped newlines!');
    console.log('Token preview:', token.substring(0, 30) + '...\n');
  } else {
    console.log('❌ Failed with escaped newlines\n');
  }

  // Test 4: With quotes around it (common mistake)
  console.log('Test 4: Testing with quotes around key');
  process.env.APPLE_MAPKIT_PRIVATE_KEY = `"${originalKey}"`;

  authModule.cachedAccessToken = null;
  token = await generateAppleMapsToken();
  if (token) {
    console.log('✅ Success with quoted key!');
    console.log('Token preview:', token.substring(0, 30) + '...\n');
  } else {
    console.log('❌ Failed with quoted key\n');
  }

  // Restore original
  process.env.APPLE_MAPKIT_PRIVATE_KEY = originalKey;
  console.log('=== Test Complete ===');
}

testAppleAuth().catch(console.error);