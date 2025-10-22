import { NextResponse } from 'next/server'
import { deleteFromVercelKV } from '@/lib/geocode-cache'
import { clearLocalGeocodeCache } from '@/lib/geocode'

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')
  const area = searchParams.get('area')

  if (!address) {
    return NextResponse.json({ ok: false, error: 'Missing address' }, { status: 400 })
  }

  // Lightweight guard: allow in non-production or with admin key
  const adminKey = process.env.ADMIN_API_KEY
  const provided = request.headers.get('x-admin-key') || searchParams.get('key')
  const vercelEnv = process.env.VERCEL_ENV || process.env.NODE_ENV
  const allowed = (vercelEnv !== 'production') || (!!adminKey && provided === adminKey)
  if (!allowed) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  // Purge KV and local
  const kvDeleted = await deleteFromVercelKV(address, area)
  clearLocalGeocodeCache(address, area)

  return NextResponse.json({ ok: true, address, area, kvDeleted })
}

export async function GET(req: Request) {
  // Support GET for convenience in preview environments
  return POST(req)
}

