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
  const [sortBy, setSortBy] = useState<"time" | "priority">("time")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [hideWithoutLocation, setHideWithoutLocation] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const categories = useMemo(() => {
    const cats = new Set(items.map((item) => item.call_category).filter(Boolean))
    return Array.from(cats).sort()
  }, [items])

  const sortedAndFilteredItems = useMemo(() => {
    let filtered = [...items]

    if (filterPriority !== "all") {
      filtered = filtered.filter((item) => getPriorityLabel(item.priority) === filterPriority)
    }

    if (filterCategory !== "all") {
      filtered = filtered.filter((item) => item.call_category === filterCategory)
    }

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

    filtered.sort((a, b) => {
      if (sortBy === "time") {
        return new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
      } else {
        return a.priority - b.priority
      }
    })

    return filtered
  }, [items, sortBy, filterPriority, filterCategory, hideWithoutLocation, searchQuery, getPriorityLabel])

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-end animate-fade-in pointer-events-none">
      <div
        className="relative h-full w-full md:w-[500px] md:h-auto md:max-h-[calc(100vh-240px)] md:mt-20 md:mb-32 md:mr-6 md:rounded-3xl bg-black/60 backdrop-blur-3xl border-l md:border border-white/20 shadow-2xl flex flex-col overflow-hidden animate-slide-in-right pointer-events-auto"
        style={{
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) inset",
        }}
      >
        <div
          className="sticky top-0 z-10 bg-black/70 backdrop-blur-xl border-b border-white/10 p-6"
          style={{
            backdropFilter: "blur(30px) saturate(180%)",
            WebkitBackdropFilter: "blur(30px) saturate(180%)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">All Incidents</h2>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full transition-all"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Search input with regex support */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search (supports regex)..."
                className="w-full pl-11 pr-10 py-2.5 bg-black/60 backdrop-blur-xl border border-white/20 rounded-xl text-sm font-semibold text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                style={{
                  backdropFilter: "blur(24px) saturate(180%)",
                  WebkitBackdropFilter: "blur(24px) saturate(180%)",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-all"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort toggle */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Sort By</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSortBy("time")}
                  className={`py-2 rounded-xl text-sm font-semibold transition-all ${
                    sortBy === "time" ? "bg-white text-black" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  Time
                </button>
                <button
                  onClick={() => setSortBy("priority")}
                  className={`py-2 rounded-xl text-sm font-semibold transition-all ${
                    sortBy === "priority" ? "bg-white text-black" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  Priority
                </button>
              </div>
            </div>

            {/* Priority filter toggles */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Priority</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setFilterPriority("all")}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                    filterPriority === "all" ? "bg-white text-black" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterPriority("CRITICAL")}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                    filterPriority === "CRITICAL" ? "bg-red-500 text-white" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  Critical
                </button>
                <button
                  onClick={() => setFilterPriority("HIGH")}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                    filterPriority === "HIGH" ? "bg-orange-500 text-white" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  High
                </button>
                <button
                  onClick={() => setFilterPriority("MEDIUM")}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                    filterPriority === "MEDIUM" ? "bg-yellow-500 text-black" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  Medium
                </button>
                <button
                  onClick={() => setFilterPriority("LOW")}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                    filterPriority === "LOW" ? "bg-gray-500 text-white" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  Low
                </button>
              </div>
            </div>

            {/* Category filter toggles */}
            {categories.length > 0 && (
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFilterCategory("all")}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                      filterCategory === "all" ? "bg-white text-black" : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all truncate ${
                        filterCategory === cat ? "bg-white text-black" : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Checkbox to hide incidents without location */}
            <button
              onClick={() => setHideWithoutLocation(!hideWithoutLocation)}
              className="w-full px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-semibold text-white transition-all flex items-center gap-2"
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                hideWithoutLocation
                  ? 'bg-red-500 border-red-500'
                  : 'border-white/40'
              }`}>
                {hideWithoutLocation && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span>Only show incidents with location</span>
            </button>
          </div>

          <div className="mt-3 text-sm text-gray-400">
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
              className="w-full text-left bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="inline-block px-2 py-1 rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: getPriorityColor(item.priority) + "30",
                        color: getPriorityColor(item.priority),
                      }}
                    >
                      {getPriorityLabel(item.priority)}
                    </span>
                    {item.call_category && (
                      <span className="text-xs text-gray-400 uppercase tracking-wide">{item.call_category}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-lg mb-1 group-hover:text-white transition-colors">{item.call_type}</h3>
                  <p className="text-sm text-gray-400 truncate">{item.address_raw || "No address"}</p>
                </div>
                <div className="text-right text-sm text-gray-400 whitespace-nowrap">
                  {new Date(item.received_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </button>
          ))}

          {sortedAndFilteredItems.length === 0 && (
            <div className="text-center py-12 text-gray-400">No incidents match your filters</div>
          )}
        </div>
      </div>
    </div>
  )
}
