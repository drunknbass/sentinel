'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('[ERROR BOUNDARY]', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-amber-500 font-mono p-6">
      <div className="max-w-2xl w-full">
        <div className="border-4 border-red-600 p-8 space-y-6 animate-pulse-amber">
          <div className="border-2 border-red-600/50 p-6">
            <div className="text-xs text-red-600/70 uppercase tracking-wider mb-4">╔ CRITICAL INCIDENT REPORTED ╗</div>

            <h1 className="text-2xl font-bold mb-4 text-red-600 crt-bloom-red animate-pulse">
              █ SYSTEM MALFUNCTION DETECTED
            </h1>

            <div className="bg-red-600/10 border-2 border-red-600/50 p-3 mb-4">
              <p className="text-xs text-red-400 uppercase tracking-wider">
                ⚠ DISPATCH ALERT: Application encountered critical error
              </p>
            </div>

            <p className="text-sm mb-4 text-amber-400">
              An unexpected error occurred while loading the dispatch system. Officers are investigating the incident.
            </p>

            <div className="bg-amber-500/10 border-2 border-amber-500/50 p-4 mb-4">
              <div className="text-xs text-amber-500/70 uppercase tracking-wider mb-2">INCIDENT REPORT:</div>
              <code className="text-xs text-amber-400 break-all">
                {error.message || 'Unknown system malfunction'}
              </code>
            </div>

            <div className="bg-black/50 border border-amber-500/30 p-3 mb-6">
              <p className="text-[10px] text-amber-500/50 italic">
                * This is not a real police incident - just a fun way to display errors!
                Your actual error has been logged for our dev team.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={reset}
                className="w-full bg-red-600 text-white py-3 px-6 hover:bg-red-500 transition-all font-bold tracking-wider border-2 border-red-600"
              >
                [ENTER] DISPATCH BACKUP UNITS
              </button>

              <button
                onClick={() => {
                  // Clear any cached data and reload from scratch
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href)
                    url.searchParams.delete('view')
                    url.searchParams.delete('lat')
                    url.searchParams.delete('lon')
                    url.searchParams.delete('zoom')
                    window.location.href = url.toString()
                  }
                }}
                className="w-full border-2 border-amber-500 text-amber-500 py-3 px-6 hover:bg-amber-500 hover:text-black transition-all font-bold tracking-wider"
              >
                [ESC] RETURN TO BASE
              </button>
            </div>

            <div className="mt-6 pt-6 border-t-2 border-red-600/50">
              <p className="text-xs text-amber-500/70">
                If this incident persists, try clearing your browser cache or contact the dev squad at support.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
