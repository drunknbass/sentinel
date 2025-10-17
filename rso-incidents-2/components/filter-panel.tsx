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
  searchTags: string[]
  onSearchTagsChange: (tags: string[]) => void
  availableTags: string[]
  isExpanded: boolean
  onExpandedChange: (expanded: boolean) => void
}

const TIME_RANGES = [
  { label: "1h", hours: 1 },
  { label: "3h", hours: 3 },
  { label: "6h", hours: 6 },
  { label: "12h", hours: 12 },
  { label: "24h", hours: 24 },
  { label: "48h", hours: 48 },
  { label: "All", hours: 999 },
]

export default function FilterPanel({
  selectedCategory,
  onCategoryChange,
  minPriority,
  onPriorityChange,
  timeRange,
  onTimeRangeChange,
  searchTags,
  onSearchTagsChange,
  availableTags,
  isExpanded,
  onExpandedChange,
}: FilterPanelProps) {
  const [searchInput, setSearchInput] = useState("")

  const handleAddTag = (tag: string) => {
    if (!searchTags.includes(tag)) {
      onSearchTagsChange([...searchTags, tag])
    }
    setSearchInput("")
  }

  const handleRemoveTag = (tag: string) => {
    onSearchTagsChange(searchTags.filter((t) => t !== tag))
  }

  const filteredSuggestions = availableTags.filter(
    (tag) => tag.toLowerCase().includes(searchInput.toLowerCase()) && !searchTags.includes(tag),
  )

  const activeFiltersCount = [
    selectedCategory ? 1 : 0,
    minPriority < 100 ? 1 : 0,
    timeRange < 999 ? 1 : 0,
    searchTags.length,
  ].reduce((a, b) => a + b, 0)

  return (
    <div className="w-80 max-w-[calc(100vw-3rem)]">
      <div className="bg-black border-2 border-amber-500 font-mono transition-all duration-300 overflow-hidden">
        <button
          onClick={() => onExpandedChange(!isExpanded)}
          className="w-full px-5 py-3 text-left hover:bg-amber-500/10 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-amber-500/70 uppercase tracking-wider mb-1">╔ FILTERS ╗</div>
              <div className="font-bold text-amber-500">
                {activeFiltersCount > 0 ? `[${activeFiltersCount}] ACTIVE` : "[0] NONE"}
              </div>
            </div>
          </div>
        </button>

        <div className={`transition-all duration-300 origin-top ${isExpanded ? 'max-h-[70vh] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="flex items-center justify-between px-5 py-4 border-b-2 border-amber-500 bg-black">
            <h3 className="font-bold text-lg text-amber-500 tracking-wider">╔═ FILTER PANEL ═╗</h3>
            <button
              onClick={() => onExpandedChange(false)}
              className="text-amber-500 hover:text-amber-400 transition-colors w-8 h-8 border-2 border-amber-500 hover:bg-amber-500 hover:text-black font-bold"
            >
              X
            </button>
          </div>

          <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto bg-black">
            <div>
              <label className="text-xs text-amber-500/70 uppercase tracking-wider mb-2 block">
                &gt; SEARCH &amp; TAGS
              </label>
              <div className="space-y-2">
                {searchTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {searchTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleRemoveTag(tag)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 border-2 border-red-600 text-sm font-bold hover:bg-red-600/30 transition-colors text-amber-500 tracking-wide"
                      >
                        [{tag}]
                        <X className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}

                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchInput.trim()) {
                      handleAddTag(searchInput.trim())
                    }
                  }}
                  placeholder="TYPE TO SEARCH..."
                  className="w-full bg-black border-2 border-amber-500 px-4 py-2.5 text-sm placeholder:text-amber-500/50 focus:outline-none focus:border-amber-400 transition-colors text-amber-500 tracking-wide"
                />

                {searchInput && filteredSuggestions.length > 0 && (
                  <div className="bg-black border-2 border-amber-500 overflow-hidden">
                    {filteredSuggestions.slice(0, 5).map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleAddTag(tag)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-amber-500/10 transition-colors text-amber-500 border-b border-amber-500/30 last:border-b-0 tracking-wide"
                      >
                        &gt; {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-amber-500/70 uppercase tracking-wider mb-3 block">&gt; TIME RANGE</label>
              <div className="space-y-3">
                <div className="relative h-2 bg-black border-2 border-amber-500 overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-amber-500 transition-all duration-300"
                    style={{
                      width: `${(TIME_RANGES.findIndex((r) => r.hours === timeRange) / (TIME_RANGES.length - 1)) * 100}%`,
                    }}
                  />
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {TIME_RANGES.map((range) => (
                    <button
                      key={range.hours}
                      onClick={() => onTimeRangeChange(range.hours)}
                      className={`py-2 text-xs font-bold transition-all border-2 tracking-wider ${
                        timeRange === range.hours
                          ? "bg-amber-500 text-black border-amber-500"
                          : "bg-black text-amber-500 border-amber-500 hover:bg-amber-500/10"
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-amber-500/70 uppercase tracking-wider mb-2 block">&gt; CATEGORY</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onCategoryChange("")}
                  className={`py-2.5 text-sm font-bold transition-all border-2 tracking-wider ${
                    selectedCategory === ""
                      ? "bg-amber-500 text-black border-amber-500"
                      : "bg-black text-amber-500 border-amber-500 hover:bg-amber-500/10"
                  }`}
                >
                  [ALL]
                </button>
                {[
                  { key: "violent", label: "VIOLENT" },
                  { key: "weapons", label: "WEAPONS" },
                  { key: "property", label: "PROPERTY" },
                  { key: "traffic", label: "TRAFFIC" },
                  { key: "disturbance", label: "DISTURB" },
                  { key: "drug", label: "DRUG" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => onCategoryChange(key)}
                    className={`py-2.5 text-sm font-bold transition-all border-2 tracking-wider ${
                      selectedCategory === key
                        ? "bg-amber-500 text-black border-amber-500"
                        : "bg-black text-amber-500 border-amber-500 hover:bg-amber-500/10"
                    }`}
                  >
                    [{label}]
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-amber-500/70 uppercase tracking-wider mb-2 block">
                &gt; MIN PRIORITY:{" "}
                {minPriority <= 20
                  ? "[CRITICAL]"
                  : minPriority <= 40
                    ? "[HIGH]"
                    : minPriority <= 60
                      ? "[MEDIUM]"
                      : "[ALL]"}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 20, label: "CRIT" },
                  { value: 40, label: "HIGH" },
                  { value: 60, label: "MED" },
                  { value: 100, label: "ALL" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => onPriorityChange(value)}
                    className={`py-2.5 text-xs font-bold transition-all border-2 tracking-wider ${
                      minPriority === value
                        ? "bg-amber-500 text-black border-amber-500"
                        : "bg-black text-amber-500 border-amber-500 hover:bg-amber-500/10"
                    }`}
                  >
                    [{label}]
                  </button>
                ))}
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={() => {
                  onCategoryChange("")
                  onPriorityChange(100)
                  onTimeRangeChange(999)
                  onSearchTagsChange([])
                }}
                className="w-full py-2.5 bg-red-600/20 border-2 border-red-600 text-sm font-bold hover:bg-red-600/30 transition-colors text-amber-500 tracking-wider"
              >
                [X] CLEAR ALL FILTERS
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
