import { TTLCache } from "./cache"

const geocodeCache = new TTLCache<{ lat: number | null; lon: number | null }>(
  Number(process.env.GEOCODE_CACHE_TTL_SECONDS || 604800) * 1000,
)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const isEnabled = String(process.env.GEOCODE_ENABLED || "true").toLowerCase() === "true"

export async function geocodeOne(address: string | null, area: string | null) {
  if (!isEnabled || !address) return { lat: null, lon: null }

  const key = `geo:${address}|${area || ""}`
  const hit = geocodeCache.get(key)
  if (hit) return hit

  const base = process.env.CENSUS_GEOCODER_BASE || "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress"
  const q = `${address}${area ? `, ${area}` : ""}, Riverside County, CA`
  const url = `${base}?address=${encodeURIComponent(q)}&benchmark=Public_AR_Current&format=json`

  await sleep(500)

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "rso-demo/1.0",
      },
    })
    const data: any = await res.json()
    const m = data?.result?.addressMatches?.[0]
    const lat = m?.coordinates?.y ?? null
    const lon = m?.coordinates?.x ?? null
    const out = { lat, lon }
    geocodeCache.set(key, out)
    return out
  } catch {
    return { lat: null, lon: null }
  }
}
