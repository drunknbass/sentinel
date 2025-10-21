"use client"
import { useEffect, useState } from "react"

export default function GPSTest() {
  const [log, setLog] = useState<string[]>([])
  const [status, setStatus] = useState<string>('unknown')

  const push = (m: any) => setLog((L) => [new Date().toISOString()+" "+String(m), ...L].slice(0,200))

  useEffect(() => {
    push(`secureContext=${String((globalThis as any).isSecureContext)}`)
    if ('permissions' in navigator && (navigator as any).permissions?.query) {
      ;(navigator as any).permissions.query({ name: 'geolocation' as PermissionName }).then((p: any) => {
        setStatus(p.state)
        push(`permissions.state=${p.state}`)
      }).catch((e: any) => push(`permissions.error=${e?.message||e}`))
    } else {
      push('permissions API not available')
    }
  }, [])

  const request = () => {
    push('requesting geolocation...')
    if (!('geolocation' in navigator)) { push('no navigator.geolocation'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus('granted')
        push(`SUCCESS ${pos.coords.latitude},${pos.coords.longitude}`)
      },
      (err) => {
        setStatus('denied')
        push(`ERROR code=${err.code} msg=${err.message}`)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  return (
    <div className="min-h-screen bg-black text-amber-500 p-4 font-mono">
      <h1 className="text-xl mb-2">GPS Test</h1>
      <div className="mb-2 text-sm">status: <span className="text-amber-400">{status}</span></div>
      <button onClick={request} className="border-2 border-amber-500 px-3 py-2 hover:bg-amber-500 hover:text-black">Request Location</button>
      <div className="mt-4 text-xs space-y-1">
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  )
}

