import { NextResponse } from 'next/server';
import { generateAppleMapsToken } from '@/lib/apple-maps-auth';
import { geocodeOne } from '@/lib/geocode';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const area = searchParams.get('area');
  const station = searchParams.get('station');
  const testApple = searchParams.get('testApple') === 'true';

  if (!address) {
    return NextResponse.json({
      error: 'Missing address parameter'
    }, { status: 400 });
  }

  const results: any = {
    request: {
      address,
      area,
      station,
      timestamp: new Date().toISOString()
    },
    environment: {
      hasTeamId: !!process.env.APPLE_MAPKIT_TEAM_ID,
      hasKeyId: !!process.env.APPLE_MAPKIT_KEY_ID,
      hasPrivateKey: !!process.env.APPLE_MAPKIT_PRIVATE_KEY,
      hasTestToken: !!process.env.APPLE_MAPKIT_TEST_TOKEN,
      vercelEnv: process.env.VERCEL_ENV,
      nodeEnv: process.env.NODE_ENV
    },
    results: {}
  };

  // Test Apple Maps authentication
  if (testApple) {
    console.log('[DEBUG] Testing Apple Maps authentication...');

    // Try to get token
    const token = await generateAppleMapsToken();
    results.appleMapsAuth = {
      tokenGenerated: !!token,
      tokenLength: token?.length || 0
    };

    if (token) {
      // Try the exact query that would be sent
      const query = `${address}${area ? `, ${area}` : ''}`;
      const userLocation = station === 'southwest'
        ? '33.616,-117.217'  // Southwest centroid
        : area === 'LAKE ELSINORE'
        ? '33.6681,-117.3273' // Lake Elsinore coordinates
        : '33.73,-115.98';    // County center

      const url = `https://maps-api.apple.com/v1/geocode?q=${encodeURIComponent(query)}&limitToCountries=US&userLocation=${userLocation}`;

      results.appleMapsQuery = {
        query,
        userLocation,
        url
      };

      try {
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        results.appleMapsResponse = {
          status: res.status,
          statusText: res.statusText,
          ok: res.ok
        };

        if (res.ok) {
          const data = await res.json();
          results.appleMapsData = {
            resultsCount: data.results?.length || 0,
            firstResult: data.results?.[0] || null
          };
        } else {
          results.appleMapsError = await res.text();
        }
      } catch (err: any) {
        results.appleMapsException = {
          message: err.message,
          stack: err.stack
        };
      }
    }
  }

  // Try full geocoding with all services
  console.log('[DEBUG] Running full geocoding for:', address, area);

  // Force Apple Maps
  const appleResult = await geocodeOne(address, area || null, true, station, 'apple');
  results.results.apple = appleResult;

  // Force Census
  const censusResult = await geocodeOne(address, area || null, true, station, 'census');
  results.results.census = censusResult;

  // Force Nominatim
  const nominatimResult = await geocodeOne(address, area || null, true, station, 'nominatim');
  results.results.nominatim = nominatimResult;

  // Normal fallback chain
  const normalResult = await geocodeOne(address, area || null, true, station);
  results.results.normal = normalResult;

  return NextResponse.json(results, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}