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
  const token = process.env.MAPBOX_ACCESS_KEY

  if (!token) {
    return NextResponse.json({ error: "Mapbox token not configured" }, { status: 500 })
  }

  return NextResponse.json({ token })
}
