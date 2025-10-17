import { describe, it, expect } from 'vitest'
import { fetchIncidents } from '../lib/sources/pressaccess-client'
import { geocodeOne } from '../lib/geocode'

const RUN = process.env.RUN_LIVE_GEOCODE_TESTS === '1'

// This is a live integration test. It fetches the latest incidents from
// the public RSO JSON endpoint and attempts to geocode the first 50.
//
// Run with:
//   RUN_LIVE_GEOCODE_TESTS=1 vitest run tests/geocode-live.test.ts
// or via package script: pnpm test:geocode-live

// Increase timeout since we are making real network calls
// Vitest default is 5s; geocoding 50 items may take longer
describe.runIf(RUN)('Live geocoding of latest 50 incidents', () => {
  it('geocodes most of the latest 50 items', async () => {
    const incidents = await fetchIncidents({ pageSize: 1000, pageNumber: 1 })
    expect(incidents.length).toBeGreaterThan(0)

    const take = Math.min(50, incidents.length)
    const slice = incidents.slice(0, take)

    const results: Array<{
      idx: number
      id: string
      address: string | null
      area: string | null
      lat: number | null
      lon: number | null
      error?: string
      query?: string
      user_location?: string
      strategy?: string
      centroid_used?: string
    }> = []

    let success = 0
    for (let i = 0; i < slice.length; i++) {
      const it = slice[i]
      const res = await geocodeOne(it.address_raw, it.area, true, it.station)
      if (res.lat !== null && res.lon !== null) success++
      results.push({
        idx: i,
        id: it.incident_id,
        address: it.address_raw,
        area: it.area,
        lat: res.lat,
        lon: res.lon,
        error: res.error,
        query: res.query,
        user_location: res.user_location,
        strategy: res.strategy,
        centroid_used: res.centroid_used,
      })
    }

    // Log a compact summary to help manual review when failures happen
    const failures = results.filter(r => r.lat === null || r.lon === null)
    // eslint-disable-next-line no-console
    console.log(`\nGeocode summary: ${success}/${take} succeeded (${Math.round((success/take)*100)}%)`)
    if (failures.length) {
      // eslint-disable-next-line no-console
      console.log('\nFailures (showing up to 10):')
      for (const f of failures.slice(0, 10)) {
        // eslint-disable-next-line no-console
        console.log({ id: f.id, address: f.address, area: f.area, error: f.error, query: f.query, user_location: f.user_location, strategy: f.strategy, centroid_used: f.centroid_used })
      }
    }

    // Heuristic threshold: we expect a strong majority to succeed.
    // If many fail, ask for manual review as requested.
    const passThreshold = Math.ceil(take * 0.7)
    if (success < passThreshold) {
      throw new Error(`Live geocoding success below threshold: ${success}/${take}. Please review failures logged above.`)
    }
  }, 120_000)
})

// If the env flag is not set, provide a helpful skipped test message
describe.runIf(!RUN)('Live geocoding (skipped)', () => {
  it('skips because RUN_LIVE_GEOCODE_TESTS is not set', () => {
    expect(true).toBe(true)
  })
})

