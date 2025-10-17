"use client"

import { useState, useMemo } from "react"
import type { IncidentsResponse } from "@/lib/api/incidents"
import { X, Search } from "lucide-react"

type Incident = IncidentsResponse["items"][number]

interface IncidentListViewProps {
  items: Incident[]
  onClose: () => void
  onSelectIncident: (incident: Incident) => void
  getPriorityLabel: (priority: number) => string
  getPriorityColor: (priority: number) => string
}

export default function IncidentListView({
  items,
  onClose,
  onSelectIncident,
  getPriorityLabel,
  getPriorityColor,
}: IncidentListViewProps) {
  const [hideWithoutLocation, setHideWithoutLocation] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

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
    <div className="fixed inset-0 z-[100] flex items-start justify-end animate-fade-in pointer-events-none">
      <div className="relative h-full w-full md:w-[500px] md:h-auto md:max-h-[calc(100vh-240px)] md:mt-20 md:mb-32 md:mr-6 md:rounded-lg bg-black/90 backdrop-blur-3xl terminal-border shadow-2xl flex flex-col overflow-hidden animate-slide-in-right pointer-events-auto">
        <div className="terminal-scanlines" />
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b terminal-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-mono font-bold text-green-400 terminal-text">All Incidents</h2>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 bg-black/60 terminal-border hover:bg-green-500/20 rounded transition-all"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-green-400" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full pl-11 pr-10 py-2.5 bg-black/60 backdrop-blur-xl terminal-border rounded text-sm font-mono font-semibold text-green-400 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-green-500/20 rounded transition-all"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 text-green-400" />
                </button>
              )}
            </div>

            {/* Toggle to hide incidents without location */}
            <button
              onClick={() => setHideWithoutLocation(!hideWithoutLocation)}
              className="w-full px-4 py-2.5 bg-black/60 terminal-border hover:bg-green-500/10 rounded text-sm font-mono font-semibold text-green-400 transition-all flex items-center gap-2"
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                hideWithoutLocation
                  ? 'bg-green-500 border-green-500'
                  : 'border-green-400/40'
              }`}>
                {hideWithoutLocation && (
                  <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span>Only show incidents with location</span>
            </button>
          </div>

          <div className="mt-3 text-sm font-mono text-green-400 terminal-text">
            Showing {sortedAndFilteredItems.length} of {items.length} incidents
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {sortedAndFilteredItems.map((item) => (
            <button
              key={item.incident_id}
              onClick={() => {
                onSelectIncident(item)
              }}
              className="w-full text-left bg-black/60 backdrop-blur-xl terminal-border rounded p-4 hover:bg-green-500/10 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="inline-block px-2 py-1 rounded text-xs font-mono font-bold"
                      style={{
                        backgroundColor: getPriorityColor(item.priority) + "30",
                        color: getPriorityColor(item.priority),
                      }}
                    >
                      {getPriorityLabel(item.priority)}
                    </span>
                    {item.call_category && (
                      <span className="text-xs text-green-400 font-mono uppercase tracking-wide">{item.call_category}</span>
                    )}
                  </div>
                  <h3 className="font-mono font-bold text-lg mb-1 text-green-400 group-hover:text-green-300 transition-colors">{item.call_type}</h3>
                  <p className="text-sm font-mono text-gray-400 truncate">{item.address_raw || "No address"}</p>
                </div>
                <div className="text-right text-sm font-mono text-green-400 whitespace-nowrap">
                  {new Date(item.received_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </button>
          ))}

          {sortedAndFilteredItems.length === 0 && (
            <div className="text-center py-12 font-mono text-green-400">No incidents match your filters</div>
          )}
        </div>
      </div>
    </div>
  )
}
