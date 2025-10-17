import jwt from 'jsonwebtoken';

/**
 * Generate a JWT token for Apple Maps API authentication
 * Tokens are valid for 30 minutes
 */
export function generateAppleMapsToken(): string | null {
  // TEMPORARY: Use the working token for testing
  // This token expires around 2025-10-24
  const TEMP_WORKING_TOKEN = 'eyJraWQiOiJKUDNDQjQzRFUyIiwidHlwIjoiSldUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJTS1c5N1I2MzRNIiwiaWF0IjoxNzYwNjQ4NzM1LCJleHAiOjE3NjEyODkxOTl9.IZIezMgJRGG5Eevt4qrlqP-iOUet7w_cSTgRB3P8iJrYmsvjuL1npJ7dx2No-wzU9-sms6Gw4uPvmmXf6G-Yow';

  // Check if token is still valid
  try {
    const parts = TEMP_WORKING_TOKEN.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const now = Math.floor(Date.now() / 1000);

    if (now < payload.exp) {
      console.log('[APPLE_MAPS] Using temporary working token (expires:', new Date(payload.exp * 1000).toISOString(), ')');
      return TEMP_WORKING_TOKEN;
    }
  } catch (e) {
    console.error('[APPLE_MAPS] Failed to parse temp token:', e);
  }

  // Fall back to generating our own token
  const teamId = process.env.APPLE_MAPKIT_TEAM_ID;
  const keyId = process.env.APPLE_MAPKIT_KEY_ID;
  const privateKey = process.env.APPLE_MAPKIT_PRIVATE_KEY;

  if (!teamId || !keyId || !privateKey) {
    console.log('[APPLE_MAPS] Missing Apple MapKit credentials');
    return null;
  }

  try {
    const token = jwt.sign(
      {
        iss: teamId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days like Apple's token
      },
      privateKey,
      {
        algorithm: 'ES256',
        keyid: keyId,
      }
    );

    return token;
  } catch (err) {
    console.error('[APPLE_MAPS] Failed to generate JWT token:', err);
    return null;
  }
}