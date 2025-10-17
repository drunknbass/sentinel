import jwt from 'jsonwebtoken';

// Cache access tokens to avoid unnecessary exchanges
let cachedAccessToken: { token: string; expires: number } | null = null;

/**
 * Generate a JWT auth token and exchange it for an access token
 * Access tokens are valid for 30 minutes
 */
export async function generateAppleMapsToken(): Promise<string | null> {
  // Check if we have a valid cached access token
  if (cachedAccessToken && cachedAccessToken.expires > Date.now()) {
    console.log('[APPLE_MAPS] Using cached access token');
    return cachedAccessToken.token;
  }

  const teamId = process.env.APPLE_MAPKIT_TEAM_ID;
  const keyId = process.env.APPLE_MAPKIT_KEY_ID;
  const privateKey = process.env.APPLE_MAPKIT_PRIVATE_KEY;

  if (!teamId || !keyId || !privateKey) {
    console.log('[APPLE_MAPS] Missing Apple MapKit credentials');
    return null;
  }

  try {
    // Step 1: Generate JWT auth token
    const authToken = jwt.sign(
      {
        iss: teamId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour validity
      },
      privateKey,
      {
        algorithm: 'ES256',
        keyid: keyId,
      }
    );

    console.log('[APPLE_MAPS] Generated auth token, exchanging for access token...');

    // Step 2: Exchange auth token for access token
    const tokenUrl = 'https://maps-api.apple.com/v1/token';
    const response = await fetch(tokenUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[APPLE_MAPS] Token exchange failed:', response.status, error);
      return null;
    }

    const data = await response.json();
    const accessToken = data.accessToken;
    const expiresInSeconds = data.expiresInSeconds || 1800; // Default 30 minutes

    if (!accessToken) {
      console.error('[APPLE_MAPS] No access token in response');
      return null;
    }

    // Cache the access token
    cachedAccessToken = {
      token: accessToken,
      expires: Date.now() + (expiresInSeconds * 1000) - 60000 // Refresh 1 minute before expiry
    };

    console.log('[APPLE_MAPS] Got access token, expires in', expiresInSeconds, 'seconds');
    return accessToken;
  } catch (err) {
    console.error('[APPLE_MAPS] Failed to get access token:', err);
    return null;
  }
}