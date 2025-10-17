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
  let privateKey = process.env.APPLE_MAPKIT_PRIVATE_KEY;

  if (!teamId || !keyId || !privateKey) {
    console.log('[APPLE_MAPS] Missing Apple MapKit credentials');
    return null;
  }

  // Log key characteristics for debugging (without exposing the actual key)
  console.log('[APPLE_MAPS] Initial key characteristics:', {
    length: privateKey.length,
    startsWithBegin: privateKey.startsWith('-----BEGIN'),
    hasNewlines: privateKey.includes('\n'),
    hasBackslashN: privateKey.includes('\\n'),
    firstChars: privateKey.substring(0, 20),
    lastChars: privateKey.substring(Math.max(0, privateKey.length - 20))
  });

  // Strip any accidental quotes that might wrap the key
  privateKey = privateKey.trim().replace(/^["']|["']$/g, '');

  // Auto-detect and handle base64-encoded keys
  const looksLikeBase64 = !privateKey.includes('-----BEGIN') &&
                          !privateKey.includes('\n') &&
                          /^[A-Za-z0-9+/]+=*$/.test(privateKey.replace(/\s/g, ''));

  console.log('[APPLE_MAPS] Base64 detection:', {
    looksLikeBase64,
    hasBeginHeader: privateKey.includes('-----BEGIN'),
    hasNewlines: privateKey.includes('\n'),
    matchesBase64Pattern: /^[A-Za-z0-9+/]+=*$/.test(privateKey.replace(/\s/g, ''))
  });

  if (looksLikeBase64) {
    console.log('[APPLE_MAPS] Detected base64-encoded private key, decoding...');
    try {
      privateKey = Buffer.from(privateKey, 'base64').toString('utf-8');
      console.log('[APPLE_MAPS] Successfully decoded base64 private key');
      console.log('[APPLE_MAPS] After decoding:', {
        length: privateKey.length,
        startsWithBegin: privateKey.startsWith('-----BEGIN'),
        hasNewlines: privateKey.includes('\n'),
        firstChars: privateKey.substring(0, 30)
      });
    } catch (e) {
      console.error('[APPLE_MAPS] Failed to decode base64 private key:', e);
      return null;
    }
  }

  // Fix escaped newlines (common in env vars)
  privateKey = privateKey.replace(/\\n/g, '\n');

  // Ensure proper PEM format
  if (!privateKey.includes('-----BEGIN')) {
    console.log('[APPLE_MAPS] Private key missing PEM headers, adding them...');
    privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
  }

  // Log key format info (safely, just first few chars)
  const keyPreview = privateKey.substring(0, 50).replace(/\n/g, '\\n');
  console.log('[APPLE_MAPS] Key format check - starts with:', keyPreview + '...');

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
    console.log('[APPLE_MAPS] Team ID:', teamId, 'Key ID:', keyId);

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
      console.error('[APPLE_MAPS] Credentials used - Team ID:', teamId, 'Key ID:', keyId);

      if (response.status === 401) {
        console.error('[APPLE_MAPS] 401 typically means:');
        console.error('  1. Team ID and Key ID mismatch');
        console.error('  2. Private key doesn\'t match the Key ID');
        console.error('  3. Private key is malformed (check Vercel env var)');
        console.error('[APPLE_MAPS] Verify the private key starts with:',
                     privateKey.substring(0, 30).replace(/\n/g, '\\n'));
      }
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
  } catch (err: any) {
    console.error('[APPLE_MAPS] Failed to get access token:', err?.message || err);

    if (err?.message?.includes('secretOrPrivateKey')) {
      console.error('[APPLE_MAPS] Private key format issue detected!');
      console.error('[APPLE_MAPS] Key should start with: -----BEGIN PRIVATE KEY-----');
      console.error('[APPLE_MAPS] Current key length:', privateKey?.length || 0);
      console.error('[APPLE_MAPS] First 50 chars:', privateKey?.substring(0, 50).replace(/\n/g, '\\n'));
      console.error('[APPLE_MAPS] Tip: In Vercel, paste the raw .p8 content, no base64 encoding needed');
    } else if (err?.code === 'ERR_OSSL_EC_INVALID_PRIVATE_KEY') {
      console.error('[APPLE_MAPS] Invalid EC private key format');
      console.error('[APPLE_MAPS] The private key is corrupted or not an ES256 key');
    } else if (err?.message?.includes('error:')) {
      console.error('[APPLE_MAPS] OpenSSL error - likely malformed private key');
      console.error('[APPLE_MAPS] Check that the private key in Vercel matches your .p8 file exactly');
    }
    return null;
  }
}