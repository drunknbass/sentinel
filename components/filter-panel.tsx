"use client"

import { useState } from "react"
import { X } from "lucide-react"

interface FilterPanelProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  minPriority: number
  onPriorityChange: (priority: number) => void
  timeRange: number
  onTimeRangeChange: (hours: number) => void
  selectedRegion: string
  onRegionChange: (region: string) => void
}

const TIME_RANGES = [
  { label: "2h", hours: 2 },
  { label: "6h", hours: 6 },
  { label: "12h", hours: 12 },
  { label: "1 day", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "7 days", hours: 168 },
  { label: "All", hours: 999 },
]

export default function FilterPanel({
  selectedCategory,
  onCategoryChange,
  minPriority,
  onPriorityChange,
  timeRange,
  onTimeRangeChange,
  selectedRegion,
  onRegionChange,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const activeFiltersCount = [
    selectedCategory ? 1 : 0,
    minPriority < 100 ? 1 : 0,
    timeRange < 999 ? 1 : 0,
    selectedRegion ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  return (
    <div className="w-80 max-w-[calc(100vw-3rem)]">
      {/* Collapsed state */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="relative w-full bg-black/80 backdrop-blur-xl terminal-border rounded-lg px-5 py-4 text-left hover:bg-green-500/10 transition-all shadow-2xl"
        >
          <div className="terminal-scanlines" />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-green-400 font-mono uppercase tracking-wider mb-1 terminal-text">Filters</div>
              <div className="font-mono font-bold text-green-400">{activeFiltersCount > 0 ? `${activeFiltersCount} active` : "No filters"}</div>
            </div>
          </div>
        </button>
      )}

      {/* Expanded state */}
      {isExpanded && (
        <div className="relative bg-black/80 backdrop-blur-xl terminal-border rounded-lg shadow-2xl overflow-hidden animate-slide-down">
          <div className="terminal-scanlines" />
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b terminal-border">
            <h3 className="font-mono font-bold text-lg text-green-400 terminal-text">Filters</h3>
            <button onClick={() => setIsExpanded(false)} className="text-green-400 hover:text-green-300 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Time range slider */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-3 block">Time Range</label>
              <div className="space-y-3">
                {/* Visual slider track */}
                <div className="relative h-2 bg-black/30 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-300"
                    style={{
                      width: `${(TIME_RANGES.findIndex((r) => r.hours === timeRange) / (TIME_RANGES.length - 1)) * 100}%`,
                    }}
                  />
                </div>

                {/* Time range buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {TIME_RANGES.map((range) => (
                    <button
                      key={range.hours}
                      onClick={() => onTimeRangeChange(range.hours)}
                      className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                        timeRange === range.hours
                          ? "bg-white text-black"
                          : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Region filter */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Region</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onRegionChange("")}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    selectedRegion === "" ? "bg-white text-black" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  All
                </button>
                {[
                  { key: "southwest", label: "Southwest" },
                  { key: "moreno", label: "Moreno Valley" },
                  { key: "central", label: "Central" },
                  { key: "jurupa", label: "Jurupa Valley" },
                  { key: "desert", label: "Desert" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => onRegionChange(key)}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      selectedRegion === key ? "bg-white text-black" : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category filter */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Category</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onCategoryChange("")}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    selectedCategory === "" ? "bg-white text-black" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  All
                </button>
                {[
                  { key: "violent", label: "Violent" },
                  { key: "weapons", label: "Weapons" },
                  { key: "property", label: "Property" },
                  { key: "traffic", label: "Traffic" },
                  { key: "disturbance", label: "Disturbance" },
                  { key: "drug", label: "Drug" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => onCategoryChange(key)}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      selectedCategory === key ? "bg-white text-black" : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority filter */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
                Min Priority:{" "}
                {minPriority <= 20 ? "Critical" : minPriority <= 40 ? "High" : minPriority <= 60 ? "Medium" : "All"}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 20, label: "Critical" },
                  { value: 40, label: "High" },
                  { value: 60, label: "Medium" },
                  { value: 100, label: "All" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => onPriorityChange(value)}
                    className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      minPriority === value ? "bg-white text-black" : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear all */}
            {activeFiltersCount > 0 && (
              <button
                onClick={() => {
                  onCategoryChange("")
                  onPriorityChange(100)
                  onTimeRangeChange(2)
                  onRegionChange("")
                }}
                className="w-full py-2.5 bg-red-500/20 border border-red-500/30 rounded-xl text-sm font-semibold hover:bg-red-500/30 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
