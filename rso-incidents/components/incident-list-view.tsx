"use client"

import { useState, useMemo } from "react"
import { X } from "lucide-react"

interface IncidentListViewProps {
  items: any[]
  onClose: () => void
  onSelectIncident: (incident: any) => void
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

    filtered.sort((a, b) => {
      if (sortBy === "time") {
        return new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
      } else {
        return a.priority - b.priority
      }
    })

    return filtered
  }, [items, sortBy, filterPriority, filterCategory, getPriorityLabel])

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center animate-fade-in">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        style={{
          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
        }}
        onClick={onClose}
      />

      <div
        className="relative w-full md:max-w-4xl md:max-h-[85vh] h-full md:h-auto bg-black/60 backdrop-blur-3xl border border-white/20 md:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
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

          <div className="flex flex-wrap gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "time" | "priority")}
              className="px-4 py-2.5 bg-black/60 backdrop-blur-xl border border-white/20 rounded-full text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 cursor-pointer hover:bg-black/80 hover:border-white/30 transition-all shadow-lg appearance-none"
              style={{
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                boxShadow: "0 4px 12px 0 rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset",
              }}
            >
              <option value="time" className="bg-[#1a2332] text-white font-semibold">
                Sort by Time
              </option>
              <option value="priority" className="bg-[#1a2332] text-white font-semibold">
                Sort by Priority
              </option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2.5 bg-black/60 backdrop-blur-xl border border-white/20 rounded-full text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 cursor-pointer hover:bg-black/80 hover:border-white/30 transition-all shadow-lg appearance-none"
              style={{
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                boxShadow: "0 4px 12px 0 rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset",
              }}
            >
              <option value="all" className="bg-[#1a2332] text-white font-semibold">
                All Priorities
              </option>
              <option value="CRITICAL" className="bg-[#1a2332] text-white font-semibold">
                Critical
              </option>
              <option value="HIGH" className="bg-[#1a2332] text-white font-semibold">
                High
              </option>
              <option value="MEDIUM" className="bg-[#1a2332] text-white font-semibold">
                Medium
              </option>
              <option value="LOW" className="bg-[#1a2332] text-white font-semibold">
                Low
              </option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2.5 bg-black/60 backdrop-blur-xl border border-white/20 rounded-full text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 cursor-pointer hover:bg-black/80 hover:border-white/30 transition-all shadow-lg appearance-none"
              style={{
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                boxShadow: "0 4px 12px 0 rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset",
              }}
            >
              <option value="all" className="bg-[#1a2332] text-white font-semibold">
                All Categories
              </option>
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-[#1a2332] text-white font-semibold">
                  {cat}
                </option>
              ))}
            </select>
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
                onClose()
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
