import { NextResponse } from 'next/server'

// Mirror Apple Maps URL scheme: /place?address=...&coordinate=lat,lon&name=...
// Redirects to our map view so you can swap apple.com with our host.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const coordinate = searchParams.get('coordinate') || ''
  const address = searchParams.get('address') || ''
  const name = searchParams.get('name') || ''

  let lat = '', lon = ''
  if (coordinate.includes(',')) {
    const [a, b] = coordinate.split(',')
    lat = a?.trim() || ''
    lon = b?.trim() || ''
  }

  const params = new URLSearchParams()
  params.set('view', 'map')
  if (lat && lon) {
    params.set('lat', lat)
    params.set('lon', lon)
    params.set('zoom', '15.0')
  }
  if (address) params.set('search', address)
  if (name) params.set('name', name)

  const target = `/${'?' + params.toString()}`
  return NextResponse.redirect(new URL(target, request.url))
}

