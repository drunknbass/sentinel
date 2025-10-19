import 'dotenv/config'
import { fetchIncidents } from '../lib/sources/pressaccess-client'
import { geocodeOne } from '../lib/geocode'

async function main() {
  const incidents = await fetchIncidents({ pageSize: 1000, pageNumber: 1 })
  // Filter to valid geocoding candidates similar to scrape.ts
  const candidates = incidents.filter(it => {
    const addr = (it.address_raw || '').toLowerCase()
    if (!it.address_raw) return false
    if (addr.includes('undefined')) return false
    if (addr === 'address withheld') return false
    if (addr === 'confidential') return false
    if (addr === 'unknown') return false
    if (addr.length < 5) return false
    return true
  })

  const take = Math.min(50, candidates.length)
  const slice = candidates.slice(0, take)

  let success = 0
  const failures: any[] = []

  console.log(`Fetched ${incidents.length} incidents. Geocoding first ${take}...`)

  for (let i = 0; i < slice.length; i++) {
    const it = slice[i]
    const res = await geocodeOne(it.address_raw, it.area, true, it.station)
    if (res.lat !== null && res.lon !== null) {
      success++
    } else {
      failures.push({
        idx: i,
        id: it.incident_id,
        address: it.address_raw,
        area: it.area,
        station: it.station,
        error: res.error,
        query: res.query,
        user_location: res.user_location,
        strategy: res.strategy,
        centroid_used: res.centroid_used,
      })
    }
  }

  const pct = Math.round((success / take) * 100)
  console.log(`\nSummary: ${success}/${take} succeeded (${pct}%)`)
  if (failures.length) {
    console.log('\nFailures (up to 20 shown):')
    for (const f of failures.slice(0, 20)) {
      console.log(f)
    }
  }

  if (success < Math.ceil(take * 0.9)) {
    console.log('\nGeocoding success below threshold. Please review failures.')
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
