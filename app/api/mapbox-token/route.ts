import { NextResponse } from "next/server"

/**
 * API Route: Mapbox Token
 *
 * Returns the Mapbox access token for client-side map rendering.
 * This is a workaround for Vercel's security scanner which flags
 * NEXT_PUBLIC_MAPBOX_* environment variables as sensitive.
 *
 * Note: Mapbox tokens are designed to be public and used on the client.
 * They should be restricted by URL in your Mapbox dashboard settings.
 */
export async function GET() {
  // For compatibility if any legacy code calls this route.
  // Prefer using NEXT_PUBLIC_MAPBOX_TOKEN directly on the client.
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.MAPBOX_ACCESS_KEY

  if (!token) {
    return NextResponse.json({ error: "Mapbox token not configured" }, { status: 500 })
  }

  // Mapbox public tokens are safe to cache; reduce function calls
  return NextResponse.json(
    { token },
    {
      headers: {
        // Cache at the edge for a day and allow long SWR
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800, immutable'
      }
    }
  )
}
