import { type NextRequest, NextResponse } from "next/server"
import { scrapeIncidents } from "../../../lib/scrape"

export const runtime = "nodejs"

type BBox = { minLon: number; minLat: number; maxLon: number; maxLat: number }

function parseBbox(bbox?: string | null): BBox | null {
  if (!bbox) return null
  try {
    const parts = bbox.split(",").map(Number)
    if (parts.length !== 4 || parts.some(isNaN)) return null
    const [minLon, minLat, maxLon, maxLat] = parts
    return { minLon, minLat, maxLon, maxLat }
  } catch (e) {
    console.error("[v0] Bbox parse error:", e)
    return null
  }
}

export async function GET(req: NextRequest) {
  console.log("[v0] API route called")

  try {
    const url = new URL(req.url)
    const since = url.searchParams.get("since")
    const until = url.searchParams.get("until")
    const area = url.searchParams.get("area")
    const callCategory = url.searchParams.get("callCategory")
    const callType = url.searchParams.get("callType")
    const minPriority = Number(url.searchParams.get("minPriority") || 0)
    const q = url.searchParams.get("q")
    const bboxStr = url.searchParams.get("bbox")
    const limit = Math.min(Number(url.searchParams.get("limit") || 1000), 3000)
    const withGeocode = ["1", "true", "yes"].includes((url.searchParams.get("geocode") || "").toLowerCase())

    console.log("[v0] Starting scrape with geocode:", withGeocode)

    let all
    try {
      all = await scrapeIncidents({ geocode: withGeocode })
    } catch (scrapeError) {
      console.error("[v0] Scraping error:", scrapeError)
      // Return empty array if scraping fails completely
      all = []
    }

    console.log("[v0] Scraped items count:", all.length)

    const items = all
      .filter((it) => {
        if (since && new Date(it.received_at) < new Date(since)) return false
        if (until && new Date(it.received_at) > new Date(until)) return false
        if (area && it.area !== area) return false
        if (callCategory && it.call_category !== callCategory) return false
        if (callType && !it.call_type.toLowerCase().includes(callType.toLowerCase())) return false
        if (minPriority && it.priority > minPriority) return false
        if (q) {
          const s = q.toLowerCase()
          const hay = `${it.incident_id} ${it.address_raw || ""} ${it.call_type} ${it.area || ""}`.toLowerCase()
          if (!hay.includes(s)) return false
        }
        return true
      })
      .slice(0, limit)

    console.log("[v0] Filtered items count:", items.length)

    const bbox = parseBbox(bboxStr)
    const itemsB = bbox
      ? items.filter(
          (i) =>
            typeof i.lon === "number" &&
            typeof i.lat === "number" &&
            i.lon! >= bbox.minLon &&
            i.lon! <= bbox.maxLon &&
            i.lat! >= bbox.minLat &&
            i.lat! <= bbox.maxLat,
        )
      : items

    console.log("[v0] Returning items count:", itemsB.length)
    return NextResponse.json(
      { count: itemsB.length, items: itemsB },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    )
  } catch (e: any) {
    console.error("[v0] API error:", e)
    return NextResponse.json(
      {
        count: 0,
        items: [],
        error: e?.message || "API request failed",
      },
      {
        status: 200, // Return 200 instead of 500 so client can handle gracefully
        headers: {
          "Cache-Control": "no-cache",
        },
      },
    )
  }
}
