import jwt from 'jsonwebtoken';

/**
 * Generate a JWT token for Apple Maps API authentication
 * Tokens are valid for 30 minutes
 */
export function generateAppleMapsToken(): string | null {
  // Disable Apple Maps for now since token is not working
  console.log('[APPLE_MAPS] Apple Maps disabled - token issues');
  return null;

  // TODO: Fix Apple Maps authentication
  // The provided token returns 401 Unauthorized
  // Need proper JWT generation with correct private key
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