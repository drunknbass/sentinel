import 'dotenv/config'
import { geocodeOne } from '../lib/geocode'

async function main() {
  const samples = [
    { address: '000 *** BLOCK E MARKHAM ST', area: 'PERRIS', station: 'southwest' },
    { address: '4100 *** BLOCK COUNTY CENTER DR', area: 'TEMECULA', station: 'southwest' },
  ]

  for (const s of samples) {
    console.log('\n=== Testing', s.address, ',', s.area, 'station:', s.station, '===')
    const res = await geocodeOne(s.address, s.area, true, s.station)
    console.log('Result:', res)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

