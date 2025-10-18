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
    <div className="flex items-center justify-center min-h-screen bg-black text-amber-500 font-mono p-3 md:p-6">
      <div className="max-w-2xl w-full">
        <div className="border-2 md:border-4 border-red-600 p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="text-[10px] md:text-xs text-red-600/70 uppercase tracking-wider">╔ CRITICAL INCIDENT ╗</div>

          <h1 className="text-lg md:text-2xl font-bold text-red-600 crt-bloom-red animate-pulse">
            █ SYSTEM ERROR
          </h1>

          <div className="bg-red-600/10 border border-red-600/50 p-2 md:p-3">
            <p className="text-[10px] md:text-xs text-red-400 uppercase tracking-wider">
              ⚠ DISPATCH ALERT: Critical error
            </p>
          </div>

          <p className="text-xs md:text-sm text-amber-400">
            An unexpected error occurred. Officers investigating.
          </p>

          <div className="bg-amber-500/10 border border-amber-500/50 p-2 md:p-4">
            <div className="text-[10px] md:text-xs text-amber-500/70 uppercase tracking-wider mb-2">ERROR:</div>
            <code className="text-[10px] md:text-xs text-amber-400 break-all block overflow-x-auto">
              {error.message || 'Unknown system malfunction'}
            </code>
          </div>

          <div className="space-y-2 md:space-y-3">
            <button
              onClick={reset}
              className="w-full bg-red-600 text-white py-2 md:py-3 px-4 md:px-6 hover:bg-red-500 transition-all font-bold tracking-wider border-2 border-red-600 text-xs md:text-sm"
            >
              <span className="hidden md:inline">[ENTER] DISPATCH BACKUP UNITS</span>
              <span className="md:hidden">RETRY</span>
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
              className="w-full border-2 border-amber-500 text-amber-500 py-2 md:py-3 px-4 md:px-6 hover:bg-amber-500 hover:text-black transition-all font-bold tracking-wider text-xs md:text-sm"
            >
              <span className="hidden md:inline">[ESC] RETURN TO BASE</span>
              <span className="md:hidden">GO HOME</span>
            </button>
          </div>

          <div className="pt-4 md:pt-6 border-t border-red-600/50">
            <p className="text-[10px] md:text-xs text-amber-500/70">
              If this persists, try clearing cache or contact support.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
