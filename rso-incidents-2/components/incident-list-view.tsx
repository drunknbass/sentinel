"use client"

import { useState, useMemo } from "react"

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
      <div className="absolute inset-0 bg-black/90" onClick={onClose} />

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

          <div className="flex flex-wrap gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "time" | "priority")}
              className="px-4 py-2.5 bg-black border-2 border-amber-500 text-sm font-mono font-bold text-amber-500 focus:outline-none focus:bg-amber-500 focus:text-black cursor-pointer hover:bg-amber-500/10 transition-all appearance-none"
            >
              <option value="time" className="bg-black text-amber-500 font-mono">
                [SORT: TIME]
              </option>
              <option value="priority" className="bg-black text-amber-500 font-mono">
                [SORT: PRIORITY]
              </option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2.5 bg-black border-2 border-amber-500 text-sm font-mono font-bold text-amber-500 focus:outline-none focus:bg-amber-500 focus:text-black cursor-pointer hover:bg-amber-500/10 transition-all appearance-none"
            >
              <option value="all" className="bg-black text-amber-500 font-mono">
                [ALL PRIORITIES]
              </option>
              <option value="CRITICAL" className="bg-black text-amber-500 font-mono">
                [CRITICAL]
              </option>
              <option value="HIGH" className="bg-black text-amber-500 font-mono">
                [HIGH]
              </option>
              <option value="MEDIUM" className="bg-black text-amber-500 font-mono">
                [MEDIUM]
              </option>
              <option value="LOW" className="bg-black text-amber-500 font-mono">
                [LOW]
              </option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2.5 bg-black border-2 border-amber-500 text-sm font-mono font-bold text-amber-500 focus:outline-none focus:bg-amber-500 focus:text-black cursor-pointer hover:bg-amber-500/10 transition-all appearance-none"
            >
              <option value="all" className="bg-black text-amber-500 font-mono">
                [ALL CATEGORIES]
              </option>
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-black text-amber-500 font-mono">
                  [{cat.toUpperCase()}]
                </option>
              ))}
            </select>
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
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="inline-block px-2 py-1 border-2 text-xs font-bold tracking-wider"
                      style={{
                        borderColor: getPriorityColor(item.priority),
                        color: getPriorityColor(item.priority),
                      }}
                    >
                      [{getPriorityLabel(item.priority)}]
                    </span>
                    {item.call_category && (
                      <span className="text-xs text-amber-500/70 uppercase tracking-wide">{item.call_category}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-lg mb-1 group-hover:text-amber-400 transition-colors text-amber-500">
                    &gt; {item.call_type}
                  </h3>
                  <p className="text-sm text-amber-500/70 truncate">LOCATION: {item.address_raw || "UNKNOWN"}</p>
                </div>
                <div className="text-right text-sm text-amber-500/70 whitespace-nowrap font-mono">
                  {new Date(item.received_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
