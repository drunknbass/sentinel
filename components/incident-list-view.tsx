"use client"

import { useState, useMemo } from "react"
import type { IncidentsResponse } from "@/lib/api/incidents"
import { X, ChevronDown, Search } from "lucide-react"

type Incident = IncidentsResponse["items"][number]

interface IncidentListViewProps {
  items: Incident[]
  onClose: () => void
  onSelectIncident: (incident: Incident) => void
  getPriorityLabel: (priority: number) => string
  getPriorityColor: (priority: number) => string
}

interface DropdownProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

function CustomDropdown({ label, value, options, onChange }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 bg-black/60 backdrop-blur-xl border border-white/20 rounded-full text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 cursor-pointer hover:bg-black/80 hover:border-white/30 transition-all shadow-lg flex items-center justify-between gap-2"
        style={{
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          boxShadow: "0 4px 12px 0 rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset",
        }}
      >
        <span>{selectedOption?.label || label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-3xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden z-50 animate-slide-down"
            style={{
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) inset",
            }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={`w-full px-4 py-3 text-left text-sm font-semibold transition-all ${
                  value === option.value
                    ? "bg-white/20 text-white"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
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

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    ...categories.map((cat) => ({ value: cat, label: cat })),
  ]

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

          <div className="flex flex-col gap-3">
            {/* Search input with regex support */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search (supports regex)..."
                className="w-full pl-11 pr-4 py-2.5 bg-black/60 backdrop-blur-xl border border-white/20 rounded-full text-sm font-semibold text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 hover:bg-black/80 hover:border-white/30 transition-all shadow-lg"
                style={{
                  backdropFilter: "blur(24px) saturate(180%)",
                  WebkitBackdropFilter: "blur(24px) saturate(180%)",
                  boxShadow: "0 4px 12px 0 rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset",
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

            <CustomDropdown
              label="Sort by"
              value={sortBy}
              options={[
                { value: "time", label: "Sort by Time" },
                { value: "priority", label: "Sort by Priority" },
              ]}
              onChange={(val) => setSortBy(val as "time" | "priority")}
            />

            <CustomDropdown
              label="Filter Priority"
              value={filterPriority}
              options={[
                { value: "all", label: "All Priorities" },
                { value: "CRITICAL", label: "Critical" },
                { value: "HIGH", label: "High" },
                { value: "MEDIUM", label: "Medium" },
                { value: "LOW", label: "Low" },
              ]}
              onChange={setFilterPriority}
            />

            <CustomDropdown
              label="Filter Category"
              value={filterCategory}
              options={categoryOptions}
              onChange={setFilterCategory}
            />

            {/* Checkbox to hide incidents without location */}
            <button
              onClick={() => setHideWithoutLocation(!hideWithoutLocation)}
              className="w-full px-4 py-2.5 bg-black/60 backdrop-blur-xl border border-white/20 rounded-full text-sm font-semibold text-white hover:bg-black/80 hover:border-white/30 transition-all shadow-lg flex items-center gap-2"
              style={{
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                boxShadow: "0 4px 12px 0 rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset",
              }}
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
              <span>Hide incidents without location</span>
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
