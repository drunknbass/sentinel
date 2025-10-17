"use client"
import React, { useEffect, useState } from "react"
import { useIsMobile } from "@/hooks/use-mobile"

declare global {
  interface Window { __gpsRequest?: () => void }
}

function hasSessionAccepted(): boolean {
  try { return sessionStorage.getItem('tosAccepted') === '1' } catch { return false }
}
function markSessionAccepted() {
  try { sessionStorage.setItem('tosAccepted', '1') } catch {}
}

export default function TosGate() {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!isMobile) return
    if (!hasSessionAccepted()) setOpen(true)
  }, [isMobile])

  if (!isMobile || !open) return null

  const accept = () => {
    markSessionAccepted()
    setOpen(false)
    try { window.__gpsRequest && window.__gpsRequest() } catch {}
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="max-w-lg w-full bg-black border-4 border-amber-500">
        <div className="border-2 border-amber-500/50 p-5 md:p-6 space-y-4 font-mono">
          <div className="flex items-center justify-between border-b-2 border-amber-500 pb-3 mb-4">
            <div className="text-xs text-amber-500/70 uppercase tracking-wider">╔ TERMS OF SERVICE ╗</div>
          </div>

          <div className="space-y-3 text-amber-400 text-sm leading-relaxed">
            <p>
              This application is unofficial. It is not affiliated with, endorsed by, or associated with the
              Riverside County Sheriff's Office or the Riverside Police Department. Data is aggregated from
              public sources for informational purposes only and may be incomplete or delayed. Do not use this
              app for emergency response. For emergencies, call 911.
            </p>
            <p className="text-amber-500/70 text-xs">By continuing you acknowledge this notice and our Terms of Service.</p>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              onClick={accept}
              className="flex-1 bg-amber-500 text-black font-bold py-2.5 border-2 border-amber-500 hover:bg-amber-400 tracking-wider"
            >
              [ENTER] ACCEPT & ENABLE LOCATION
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

