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
        <div className="border-4 border-amber-500 p-8 space-y-6">
          <div className="border-2 border-amber-500/50 p-6">
            <div className="text-xs text-amber-500/70 uppercase tracking-wider mb-4">╔ SYSTEM ERROR ╗</div>

            <h1 className="text-2xl font-bold mb-4 text-red-600">
              █ APPLICATION ERROR
            </h1>

            <p className="text-sm mb-6">
              An unexpected error occurred while loading the application. This is usually temporary.
            </p>

            <div className="bg-amber-500/10 border-2 border-amber-500/50 p-4 mb-6">
              <div className="text-xs text-amber-500/70 uppercase tracking-wider mb-2">ERROR DETAILS:</div>
              <code className="text-xs text-amber-400 break-all">
                {error.message || 'Unknown error occurred'}
              </code>
            </div>

            <div className="space-y-3">
              <button
                onClick={reset}
                className="w-full bg-amber-500 text-black py-3 px-6 hover:bg-amber-400 transition-all font-bold tracking-wider"
              >
                [ENTER] RETRY
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
                [ESC] RETURN TO START
              </button>
            </div>

            <div className="mt-6 pt-6 border-t-2 border-amber-500">
              <p className="text-xs text-amber-500/70">
                If this error persists, try clearing your browser cache or contact support.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
