"use client"

import { useMemo } from "react"
import type { IncidentsResponse } from "@/lib/api/incidents"
import { X, Search, MapPin, AlertTriangle } from "lucide-react"

type Incident = IncidentsResponse["items"][number]

interface IncidentListViewProps {
  items: Incident[]
  onClose: () => void
  onSelectIncident: (incident: Incident) => void
  getPriorityLabel: (priority: number) => string
  getPriorityColor: (priority: number) => string
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  hideWithoutLocation: boolean
  onHideWithoutLocationChange: (hide: boolean) => void
}

/**
 * Returns address accuracy tier based on available information
 */
const getLocationAccuracy = (incident: Incident): { label: string; hasLocation: boolean } => {
  const hasLocation = !!(incident.lat && incident.lon)

  if (!incident.address_raw) {
    return { label: "NO LOCATION", hasLocation: false }
  }

  const address = incident.address_raw.trim()

  // Check if it has numbers with redaction stars - most accurate
  if (/^\d+/.test(address) && /\*\*\*/.test(address)) {
    return { label: "BLOCK LEVEL", hasLocation }
  }

  // Check if it has numbers without stars - moderately accurate
  if (/^\d+/.test(address)) {
    return { label: "BLOCK LEVEL", hasLocation }
  }

  // Check for intersection - less accurate
  if (/\b(AND|&|\/)\b/i.test(address)) {
    return { label: "INTERSECTION", hasLocation }
  }

  // Just area name - least accurate
  return { label: "AREA ONLY", hasLocation }
}

export default function IncidentListView({
  items,
  onClose,
  onSelectIncident,
  getPriorityLabel,
  getPriorityColor,
  searchQuery,
  onSearchQueryChange,
  hideWithoutLocation,
  onHideWithoutLocationChange,
}: IncidentListViewProps) {

  const sortedAndFilteredItems = useMemo(() => {
    let filtered = [...items]

    if (hideWithoutLocation) {
      filtered = filtered.filter((item) => item.lat && item.lon)
    }

    // Search filter with regex support
    if (searchQuery.trim()) {
      try {
        // Try to create a regex from the search query (case insensitive)
        const regex = new RegExp(searchQuery, "i")
        filtered = filtered.filter((item) => {
          const searchableFields = [
            item.call_type,
            item.address_raw,
            item.call_category,
            item.area,
            getPriorityLabel(item.priority),
          ].filter(Boolean).join(" ")

          return regex.test(searchableFields)
        })
      } catch (e) {
        // If regex is invalid, fall back to simple case-insensitive includes
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter((item) => {
          const searchableFields = [
            item.call_type,
            item.address_raw,
            item.call_category,
            item.area,
            getPriorityLabel(item.priority),
          ].filter((f): f is string => Boolean(f)).map(f => f.toLowerCase()).join(" ")

          return searchableFields.includes(query)
        })
      }
    }

    return filtered
  }, [items, hideWithoutLocation, searchQuery, getPriorityLabel])

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center animate-fade-in no-overscroll">
      <div className="absolute inset-0 bg-black/90 no-overscroll" onClick={onClose} onTouchMove={(e) => e.preventDefault()} />

      <div className="relative w-full md:max-w-4xl md:max-h-[85vh] h-full md:h-auto bg-black border-4 border-amber-500 flex flex-col overflow-hidden">
        <div className="sticky top-0 z-10 bg-black border-b-4 border-amber-500 p-6">
          <div className="text-xs font-mono text-amber-500 mb-2">
            ╔═══════════════════════════════════════════════════════════════════════════════╗
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold font-mono text-amber-500 tracking-wider">[ALL INCIDENTS]</h2>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 border-2 border-amber-500 hover:bg-amber-500 hover:text-black transition-all text-amber-500 font-mono font-bold"
              aria-label="Close"
            >
              X
            </button>
          </div>

          <div className="space-y-3">
            {/* Search input - Amber MDT style */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="TYPE TO SEARCH..."
                className="w-full pl-11 pr-10 py-2.5 bg-black border-2 border-amber-500 text-sm font-mono font-bold text-amber-500 placeholder:text-amber-500/50 focus:outline-none focus:bg-amber-500/10 transition-all tracking-wide"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchQueryChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-amber-500/20 transition-all"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 text-amber-500" />
                </button>
              )}
            </div>

            {/* Toggle to hide incidents without location - Amber MDT style */}
            <button
              onClick={() => onHideWithoutLocationChange(!hideWithoutLocation)}
              className="w-full px-4 py-2.5 bg-black border-2 border-amber-500 hover:bg-amber-500/10 text-sm font-mono font-bold text-amber-500 transition-all flex items-center gap-2 tracking-wide"
            >
              <div className={`w-5 h-5 border-2 flex items-center justify-center transition-all ${
                hideWithoutLocation
                  ? 'bg-amber-500 border-amber-500'
                  : 'border-amber-500'
              }`}>
                {hideWithoutLocation && (
                  <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span>[ONLY SHOW INCIDENTS WITH LOCATION]</span>
            </button>
          </div>

          <div className="mt-3 text-sm font-mono text-amber-500/70 tracking-wider">
            &gt; SHOWING {sortedAndFilteredItems.length} OF {items.length} INCIDENTS
          </div>

          <div className="text-xs font-mono text-amber-500 mt-2">
            ╚═══════════════════════════════════════════════════════════════════════════════╝
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-black">
          {sortedAndFilteredItems.map((item) => (
            <button
              key={item.incident_id}
              onClick={() => {
                onSelectIncident(item)
                onClose()
              }}
              className="w-full text-left bg-black border-2 border-amber-500 p-4 hover:bg-amber-500/10 transition-all group font-mono"
            >
              <div className="space-y-3">
                {/* Badges row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Priority badge */}
                  <div
                    className="inline-block px-3 py-1 border-2 text-xs font-bold tracking-wider uppercase"
                    style={{
                      borderColor: getPriorityColor(item.priority),
                      color: getPriorityColor(item.priority),
                      boxShadow: `0 0 4px ${getPriorityColor(item.priority)}40`
                    }}
                  >
                    [P-{item.priority} {getPriorityLabel(item.priority)}]
                  </div>
                  {/* Category badge */}
                  {item.call_category && (
                    <div className="inline-block px-3 py-1 border-2 border-amber-500/50 text-xs font-bold tracking-wider uppercase text-amber-500/70">
                      [{item.call_category}]
                    </div>
                  )}
                  {/* Location accuracy indicator */}
                  {(() => {
                    const locationInfo = getLocationAccuracy(item)
                    return (
                      <div className={`inline-flex items-center gap-1 px-3 py-1 border-2 text-xs font-bold tracking-wider uppercase ${
                        locationInfo.hasLocation
                          ? 'border-green-500/50 text-green-500/70'
                          : 'border-red-500/50 text-red-500/70'
                      }`}>
                        [{locationInfo.hasLocation ? <MapPin className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />} {locationInfo.label}]
                      </div>
                    )
                  })()}
                </div>

                {/* Incident details */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg mb-1 group-hover:text-amber-400 transition-colors text-amber-500">
                      &gt; {item.call_type}
                    </h3>
                    <p className="text-sm text-amber-500/70 truncate">LOCATION: {item.address_raw || "UNKNOWN"}</p>
                  </div>
                  <div className="text-right text-sm text-amber-500/70 whitespace-nowrap font-mono">
                    {new Date(item.received_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            </button>
          ))}

          {sortedAndFilteredItems.length === 0 && (
            <div className="text-center py-12 text-amber-500/70 font-mono tracking-wider">
              &gt; NO INCIDENTS MATCH YOUR FILTERS
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
