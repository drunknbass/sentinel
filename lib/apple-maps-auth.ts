import jwt from 'jsonwebtoken';

// Cache access tokens to avoid unnecessary exchanges
let cachedAccessToken: { token: string; expires: number } | null = null;

/**
 * Generate a JWT auth token and exchange it for an access token
 * Access tokens are valid for 30 minutes
 */
export async function generateAppleMapsToken(): Promise<string | null> {
  const timestamp = new Date().toISOString();
  console.log(`[APPLE_MAPS ${timestamp}] ========== TOKEN GENERATION START ==========`);

  // Check cache status
  if (cachedAccessToken) {
    const isValid = cachedAccessToken.expires > Date.now();
    const timeLeft = Math.floor((cachedAccessToken.expires - Date.now()) / 1000);
    console.log(`[APPLE_MAPS ${timestamp}] Cache status: EXISTS, valid=${isValid}, timeLeft=${timeLeft}s`);

    if (isValid) {
      console.log(`[APPLE_MAPS ${timestamp}] Using cached access token (${timeLeft}s remaining)`);
      console.log(`[APPLE_MAPS ${timestamp}] ========== TOKEN GENERATION END (CACHED) ==========`);
      return cachedAccessToken.token;
    } else {
      console.log(`[APPLE_MAPS ${timestamp}] Cache expired, clearing...`);
      cachedAccessToken = null;
    }
  } else {
    console.log(`[APPLE_MAPS ${timestamp}] Cache status: EMPTY`);
  }

  // TEST: Try using pre-generated token FIRST
  const testToken = process.env.APPLE_MAPKIT_TEST_TOKEN || 'eyJraWQiOiJKUDNDQjQzRFUyIiwidHlwIjoiSldUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJTS1c5N1I2MzRNIiwiaWF0IjoxNzYwNjQ4NzM1LCJleHAiOjE3NjEyODkxOTl9.IZIezMgJRGG5Eevt4qrlqP-iOUet7w_cSTgRB3P8iJrYmsvjuL1npJ7dx2No-wzU9-sms6Gw4uPvmmXf6G-Yow';
  const hasTestToken = testToken && testToken !== 'SKIP';

  console.log(`[APPLE_MAPS ${timestamp}] Test token: ${hasTestToken ? 'PRESENT' : 'SKIP'}`);

  if (hasTestToken) {
    console.log(`[APPLE_MAPS ${timestamp}] Attempting test token exchange...`);
    try {
      const tokenUrl = 'https://maps-api.apple.com/v1/token';
      const response = await fetch(tokenUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testToken}`,
        }
      });

      console.log(`[APPLE_MAPS ${timestamp}] Test token response: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        const accessToken = data.accessToken;
        const expiresInSeconds = data.expiresInSeconds || 1800;

        if (accessToken) {
          console.log(`[APPLE_MAPS ${timestamp}] ✅ Test token SUCCESS! Got access token, expires in ${expiresInSeconds}s`);
          cachedAccessToken = {
            token: accessToken,
            expires: Date.now() + (expiresInSeconds * 1000) - 60000
          };
          console.log(`[APPLE_MAPS ${timestamp}] ========== TOKEN GENERATION END (TEST TOKEN) ==========`);
          return accessToken;
        } else {
          console.error(`[APPLE_MAPS ${timestamp}] ❌ Test token response missing accessToken:`, data);
        }
      } else {
        const error = await response.text();
        console.error(`[APPLE_MAPS ${timestamp}] ❌ Test token failed: ${response.status} - ${error}`);
      }
    } catch (err) {
      console.error(`[APPLE_MAPS ${timestamp}] ❌ Test token exception:`, err);
    }
  }

  // Fall back to generating token from credentials
  console.log(`[APPLE_MAPS ${timestamp}] Attempting JWT generation with credentials...`);

  const teamId = process.env.APPLE_MAPKIT_TEAM_ID;
  const keyId = process.env.APPLE_MAPKIT_KEY_ID;
  let privateKey = process.env.APPLE_MAPKIT_PRIVATE_KEY;

  console.log(`[APPLE_MAPS ${timestamp}] Credentials check: teamId=${!!teamId}, keyId=${!!keyId}, privateKey=${!!privateKey}`);

  if (!teamId || !keyId || !privateKey) {
    console.error(`[APPLE_MAPS ${timestamp}] ❌ Missing Apple MapKit credentials`);
    console.log(`[APPLE_MAPS ${timestamp}] ========== TOKEN GENERATION END (NO CREDS) ==========`);
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
    console.log(`[APPLE_MAPS ${timestamp}] Signing JWT with ES256...`);
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

    console.log(`[APPLE_MAPS ${timestamp}] ✅ JWT signed successfully. Team ID: ${teamId}, Key ID: ${keyId}`);
    console.log(`[APPLE_MAPS ${timestamp}] Exchanging JWT for access token...`);

    // Step 2: Exchange auth token for access token
    const tokenUrl = 'https://maps-api.apple.com/v1/token';
    const response = await fetch(tokenUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      }
    });

    console.log(`[APPLE_MAPS ${timestamp}] Exchange response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.text();
      console.error(`[APPLE_MAPS ${timestamp}] ❌ Token exchange FAILED: ${response.status} - ${error}`);
      console.error(`[APPLE_MAPS ${timestamp}] Credentials: Team ID=${teamId}, Key ID=${keyId}`);

      if (response.status === 401) {
        console.error(`[APPLE_MAPS ${timestamp}] 401 Unauthorized typically means:`);
        console.error(`[APPLE_MAPS ${timestamp}]   1. Team ID and Key ID mismatch`);
        console.error(`[APPLE_MAPS ${timestamp}]   2. Private key doesn't match the Key ID`);
        console.error(`[APPLE_MAPS ${timestamp}]   3. Private key is malformed`);
        console.error(`[APPLE_MAPS ${timestamp}] Key starts with: ${privateKey.substring(0, 30).replace(/\n/g, '\\n')}...`);

        // Clear the cached token since it's invalid
        cachedAccessToken = null;
        console.error(`[APPLE_MAPS ${timestamp}] Cleared invalid cached token`);
      }
      console.log(`[APPLE_MAPS ${timestamp}] ========== TOKEN GENERATION END (EXCHANGE FAILED) ==========`);
      return null;
    }

    const data = await response.json();
    const accessToken = data.accessToken;
    const expiresInSeconds = data.expiresInSeconds || 1800; // Default 30 minutes

    if (!accessToken) {
      console.error(`[APPLE_MAPS ${timestamp}] ❌ No accessToken in response:`, data);
      console.log(`[APPLE_MAPS ${timestamp}] ========== TOKEN GENERATION END (NO ACCESS TOKEN) ==========`);
      return null;
    }

    // Cache the access token
    cachedAccessToken = {
      token: accessToken,
      expires: Date.now() + (expiresInSeconds * 1000) - 60000 // Refresh 1 minute before expiry
    };

    console.log(`[APPLE_MAPS ${timestamp}] ✅ JWT exchange SUCCESS! Access token expires in ${expiresInSeconds}s`);
    console.log(`[APPLE_MAPS ${timestamp}] ========== TOKEN GENERATION END (JWT SUCCESS) ==========`);
    return accessToken;
  } catch (err: any) {
    console.error(`[APPLE_MAPS ${timestamp}] ❌ EXCEPTION during token generation:`, err?.message || err);

    if (err?.message?.includes('secretOrPrivateKey')) {
      console.error(`[APPLE_MAPS ${timestamp}] Private key format issue detected!`);
      console.error(`[APPLE_MAPS ${timestamp}] Key should start with: -----BEGIN PRIVATE KEY-----`);
      console.error(`[APPLE_MAPS ${timestamp}] Current key length:`, privateKey?.length || 0);
      console.error(`[APPLE_MAPS ${timestamp}] First 50 chars:`, privateKey?.substring(0, 50).replace(/\n/g, '\\n'));
      console.error(`[APPLE_MAPS ${timestamp}] Tip: In Vercel, paste the raw .p8 content`);
    } else if (err?.code === 'ERR_OSSL_EC_INVALID_PRIVATE_KEY') {
      console.error(`[APPLE_MAPS ${timestamp}] Invalid EC private key format`);
      console.error(`[APPLE_MAPS ${timestamp}] The private key is corrupted or not an ES256 key`);
    } else if (err?.message?.includes('error:')) {
      console.error(`[APPLE_MAPS ${timestamp}] OpenSSL error - likely malformed private key`);
      console.error(`[APPLE_MAPS ${timestamp}] Check that the private key in Vercel matches your .p8 file`);
    }
    console.log(`[APPLE_MAPS ${timestamp}] ========== TOKEN GENERATION END (EXCEPTION) ==========`);
    return null;
  }
}