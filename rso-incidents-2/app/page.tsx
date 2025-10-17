"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import FilterPanel from "@/components/filter-panel"
import LandingPage from "@/components/landing-page"
import IncidentListView from "@/components/incident-list-view"

/**
 * Category color mapping for incident classification
 * Updated with cyberpunk neon color palette
 */
const CATEGORY_COLORS: Record<string, string> = {
  violent: "#ff0066",
  weapons: "#ff3366",
  property: "#ffaa00",
  traffic: "#00ff88",
  disturbance: "#ffdd00",
  drug: "#aa00ff",
  medical: "#ff0099",
  admin: "#6b7280",
  other: "#00ddff",
}

// Dynamically import LeafletMap to avoid SSR issues with Leaflet
const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <div className="text-amber-500 font-mono">
        <div className="mb-2 text-center">╔════════════════════╗</div>
        <div className="text-center">║ LOADING MAP... ║</div>
        <div className="mt-2 text-center">╚════════════════════╝</div>
      </div>
    </div>
  ),
})

/**
 * Main Page Component
 *
 * Manages the entire incident tracking application including:
 * - Landing page with location permission request
 * - Interactive map view with incident markers
 * - Filter panel for searching and filtering incidents
 * - Critical incident carousel for high-priority alerts
 * - Detail modals/sheets for viewing incident information
 * - List view for browsing all incidents
 */
export default function Page() {
  // UI state
  const [showLanding, setShowLanding] = useState(true)
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false)
  const [showListView, setShowListView] = useState(false)
  const [showBottomSheet, setShowBottomSheet] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [mapStyle, setMapStyle] = useState<"crt" | "normal">("crt")
  const [filterPanelExpanded, setFilterPanelExpanded] = useState(false)

  // Data state
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [minPriority, setMinPriority] = useState(100)
  const [timeRange, setTimeRange] = useState(999)
  const [searchTags, setSearchTags] = useState<string[]>([])

  // Critical carousel state
  const [criticalCarouselIndex, setCriticalCarouselIndex] = useState(0)
  const [showCriticalCarousel, setShowCriticalCarousel] = useState(true)

  /**
   * Handles entering the map view from landing page
   * Requests location permission if available
   */
  const handleEnterMapView = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationPermissionGranted(true)
          setShowLanding(false)
        },
        (error) => {
          setShowLanding(false)
        },
        { timeout: 5000 },
      )
    } else {
      setShowLanding(false)
    }
  }

  /**
   * Converts numeric priority to human-readable label
   */
  const getPriorityLabel = (priority: number) => {
    if (priority <= 20) return "CRITICAL"
    if (priority <= 40) return "HIGH"
    if (priority <= 60) return "MEDIUM"
    return "LOW"
  }

  /**
   * Gets color for priority level
   */
  const getPriorityColor = (priority: number) => {
    if (priority <= 20) return "#ff0066"
    if (priority <= 40) return "#ff3366"
    if (priority <= 60) return "#ffdd00"
    return "#6b7280"
  }

  /**
   * Extracts all available tags from incidents for search functionality
   */
  const availableTags = useMemo(() => {
    const tags = new Set<string>()
    items.forEach((item) => {
      if (item.call_category) tags.add(item.call_category)
      if (item.area) tags.add(item.area)
      const priority = getPriorityLabel(item.priority)
      tags.add(priority.toLowerCase())
    })
    return Array.from(tags).sort()
  }, [items])

  /**
   * Filters incidents based on time range and search tags
   */
  const filteredItems = useMemo(() => {
    let filtered = items

    // Filter by time range
    if (timeRange < 999) {
      const cutoffTime = Date.now() - timeRange * 60 * 60 * 1000
      filtered = filtered.filter((item) => new Date(item.received_at).getTime() >= cutoffTime)
    }

    // Filter by search tags
    if (searchTags.length > 0) {
      filtered = filtered.filter((item) => {
        const itemTags = [
          item.call_category?.toLowerCase(),
          item.area?.toLowerCase(),
          getPriorityLabel(item.priority).toLowerCase(),
          item.call_type?.toLowerCase(),
        ].filter(Boolean)

        return searchTags.some((tag) => itemTags.some((itemTag) => itemTag?.includes(tag.toLowerCase())))
      })
    }

    return filtered
  }, [items, timeRange, searchTags])

  /**
   * Identifies critical incidents for the carousel
   * Critical = priority <= 20 AND (violent or weapons category)
   */
  const criticalIncidents = filteredItems.filter(
    (item) => item.priority <= 20 && (item.call_category === "violent" || item.call_category === "weapons"),
  )

  /**
   * Fetches incidents from API on mount and every 60 seconds when online
   */
  useEffect(() => {
    if (showLanding || !isOnline) return

    const fetchIncidents = async () => {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (selectedCategory) params.set("callCategory", selectedCategory)
      params.set("minPriority", String(minPriority))
      params.set("geocode", "1")

      try {
        const res = await fetch(`/api/incidents?${params.toString()}`)

        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(`API returned ${res.status}: ${errorText}`)
        }

        const data = await res.json()
        setItems(data.items || [])
      } catch (err: any) {
        setError(err?.message || "Failed to load incidents")
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    fetchIncidents()
    const interval = setInterval(fetchIncidents, 60000)
    return () => clearInterval(interval)
  }, [selectedCategory, minPriority, showLanding, isOnline])

  /**
   * Auto-advances critical carousel every 8 seconds
   */
  useEffect(() => {
    if (criticalIncidents.length > 1 && showCriticalCarousel && !showBottomSheet) {
      const interval = setInterval(() => {
        setCriticalCarouselIndex((prev) => (prev + 1) % criticalIncidents.length)
      }, 8000)
      return () => clearInterval(interval)
    }
  }, [criticalIncidents.length, showCriticalCarousel, showBottomSheet])

  /**
   * Calculates map bounds for all filtered incidents
   */
  const mapBounds = useMemo(() => {
    const validItems = filteredItems.filter((item) => item.lat && item.lon)
    if (validItems.length === 0) return null

    const lats = validItems.map((item) => item.lat!)
    const lons = validItems.map((item) => item.lon!)

    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLon: Math.min(...lons),
      maxLon: Math.max(...lons),
    }
  }, [filteredItems])

  /**
   * Keyboard shortcuts handler
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC key - close panels
      if (e.key === "Escape") {
        if (showListView) {
          setShowListView(false)
        } else if (showBottomSheet || selectedIncident) {
          setShowBottomSheet(false)
          setSelectedIncident(null)
        } else if (showCriticalCarousel && criticalIncidents.length > 0) {
          setShowCriticalCarousel(false)
        } else if (filterPanelExpanded) {
          setFilterPanelExpanded(false)
        }
      }

      // ENTER key - open CTA when carousel is visible
      if (e.key === "Enter" && showCriticalCarousel && criticalIncidents.length > 0 && !showBottomSheet) {
        setShowCriticalCarousel(false)
        setSelectedIncident(criticalIncidents[criticalCarouselIndex])
        setTimeout(() => {
          if (window.innerWidth < 768) {
            setShowBottomSheet(true)
          } else {
            setShowBottomSheet(false)
          }
        }, 100)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showListView, showBottomSheet, selectedIncident, showCriticalCarousel, criticalIncidents, criticalCarouselIndex, filterPanelExpanded])

  /**
   * Panel conflict management - close other panels when one opens
   */
  useEffect(() => {
    // Close filter panel when list view or incident detail opens
    if ((showListView || selectedIncident) && filterPanelExpanded) {
      setFilterPanelExpanded(false)
    }
  }, [showListView, selectedIncident, filterPanelExpanded])

  useEffect(() => {
    // Close list view when incident detail is opened
    if (selectedIncident && showListView) {
      setShowListView(false)
    }
  }, [selectedIncident, showListView])

  if (showLanding) {
    return <LandingPage onEnter={handleEnterMapView} />
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      <div
        className="absolute bottom-6 left-6 z-20 md:z-40 bg-black border border-amber-500 max-w-xs group hover:max-w-sm transition-all duration-300"
        onMouseEnter={() => setFilterPanelExpanded(false)}
      >
        <div className="border border-amber-500/50 p-1.5">
          {/* Collapsed state - always visible - much smaller now */}
          <div className="text-[10px] md:text-[9px] font-mono font-bold text-amber-500 tracking-wider">[LEGEND]</div>

          {/* Expanded content - visible on hover */}
          <div className="space-y-3 text-xs font-mono opacity-0 max-h-0 overflow-hidden group-hover:opacity-100 group-hover:max-h-[500px] transition-all duration-300 group-hover:pt-2 group-hover:mt-2 group-hover:border-t group-hover:border-amber-500">
            {/* Priority levels */}
            <div>
              <div className="text-amber-500/70 mb-2 text-[10px] tracking-wider">PRIORITY LEVELS:</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 bg-[#8b0000] border border-[#8b0000]"
                    style={{ boxShadow: "0 0 4px #8b0000" }}
                  />
                  <span className="text-[#8b0000]">VIOLENT</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 bg-[#ff0000] border border-[#ff0000]"
                    style={{ boxShadow: "0 0 4px #ff0000" }}
                  />
                  <span className="text-[#ff0000]">WEAPONS</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 bg-[#ff4500] border border-[#ff4500]"
                    style={{ boxShadow: "0 0 4px #ff4500" }}
                  />
                  <span className="text-[#ff4500]">PROPERTY</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 bg-[#ff8c00] border border-[#ff8c00]"
                    style={{ boxShadow: "0 0 4px #ff8c00" }}
                  />
                  <span className="text-[#ff8c00]">TRAFFIC</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 bg-[#ffa500] border border-[#ffa500]"
                    style={{ boxShadow: "0 0 4px #ffa500" }}
                  />
                  <span className="text-[#ffa500]">DISTURBANCE</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 bg-[#ffb000] border border-[#ffb000]"
                    style={{ boxShadow: "0 0 4px #ffb000" }}
                  />
                  <span className="text-[#ffb000]">DRUG</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 bg-[#d4af37] border border-[#d4af37]"
                    style={{ boxShadow: "0 0 4px #d4af37" }}
                  />
                  <span className="text-[#d4af37]">MEDICAL</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#9b870c] border border-[#9b870c]" />
                  <span className="text-[#9b870c]">OTHER</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#6b7280] border border-[#6b7280]" />
                  <span className="text-[#6b7280]">ADMIN</span>
                </div>
              </div>
            </div>

            {/* Location accuracy */}
            <div className="pt-2 border-t border-amber-500">
              <div className="text-amber-500/70 mb-2 text-[10px] tracking-wider">LOCATION TYPE:</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-500 border border-amber-500" />
                  <span className="text-amber-500">EXACT</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-dashed border-amber-500 animate-pulse" />
                  <span className="text-amber-500">APPROXIMATE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-0 left-0 right-0 z-50 bg-black border-b-2 border-amber-500">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="text-xs font-mono text-amber-500">
            ╔═══════════════════════════════════════════════════════════════════════════════╗
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-2 bg-black">
          <div className="text-xs font-mono font-bold text-amber-500">RSO-MDT v2.1</div>
          <div className="text-sm font-mono font-bold text-amber-500 tracking-wider hidden md:block">
            RIVERSIDE SHERIFF MOBILE DATA TERMINAL
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFilterPanelExpanded(!filterPanelExpanded)}
              className="md:hidden flex items-center gap-2 text-sm font-mono text-amber-500 border-2 border-amber-500 px-4 py-2 hover:bg-amber-500 hover:text-black transition-all"
            >
              <span>FILTERS</span>
            </button>
            <button
              onClick={() => setMapStyle(mapStyle === "crt" ? "normal" : "crt")}
              className="flex items-center gap-2 text-xs md:text-xs font-mono text-amber-500 border-2 border-amber-500 px-3 py-1.5 md:px-3 md:py-1 hover:bg-amber-500 hover:text-black transition-all"
            >
              <span>{mapStyle === "crt" ? "CRT" : "SAT"}</span>
            </button>
            <button
              onClick={() => setIsOnline(!isOnline)}
              className="flex items-center gap-2 text-xs md:text-xs font-mono text-amber-500 border-2 border-amber-500 px-3 py-1.5 md:px-3 md:py-1 hover:bg-amber-500 hover:text-black transition-all"
            >
              <span className={isOnline ? "animate-blink" : "opacity-50"}>█</span>
              <span className={isOnline ? "" : "opacity-50"}>{isOnline ? "ONLINE" : "OFFLINE"}</span>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-2">
          <div className="text-xs font-mono text-amber-500">
            ╚═══════════════════════════════════════════════════════════════════════════════╝
          </div>
        </div>
      </div>

      {/* Main map view */}
      <div className="absolute inset-0 bg-black z-10">
        <LeafletMap
          items={filteredItems}
          onMarkerClick={(item) => {
            setSelectedIncident(item)
            if (window.innerWidth < 768) {
              setShowBottomSheet(true)
            }
          }}
          selectedIncident={selectedIncident}
          mapStyle={mapStyle}
        />
      </div>

      <FilterPanel
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        minPriority={minPriority}
        onPriorityChange={setMinPriority}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        searchTags={searchTags}
        onSearchTagsChange={setSearchTags}
        availableTags={availableTags}
        isExpanded={filterPanelExpanded}
        onExpandedChange={setFilterPanelExpanded}
      />

      {/* Desktop HUD badges - left side aligned with filter panel */}
      <div className="hidden md:flex absolute top-32 left-6 z-40 gap-3">
        {/* Live status badge */}
        <div className="bg-black border-2 border-amber-500 px-4 py-3 text-xs font-mono font-bold text-amber-500 tracking-wider">
          <span className={isOnline ? "animate-blink" : "opacity-50"}>█</span> {isOnline ? "LIVE" : "OFFLINE"}
        </div>

        {/* Critical incidents badge */}
        {criticalIncidents.length > 0 && (
          <div className="bg-black border-2 border-red-600 px-4 py-3 text-xs font-mono font-bold text-red-600 tracking-wider crt-bloom-red">
            <span className="animate-blink">█</span> CRITICAL: {criticalIncidents.length}
          </div>
        )}
      </div>

      {/* All incidents button - right side */}
      <button
        onClick={() => setShowListView(true)}
        className="hidden md:block absolute top-32 right-6 z-40 bg-black border-2 border-amber-500 px-6 py-3 text-xs font-mono font-bold hover:bg-amber-500 hover:text-black transition-all text-amber-500 tracking-wider"
      >
        [{selectedCategory ? selectedCategory.toUpperCase() : "ALL"}] INCIDENTS: {filteredItems.length}
      </button>

      {criticalIncidents.length > 0 && showCriticalCarousel && !showBottomSheet && (
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 md:p-6 bg-gradient-to-t from-black via-black/95 to-transparent animate-slide-up md:animate-spring-zoom">
          <div className="max-w-3xl mx-auto bg-black/80 backdrop-blur-sm border-2 border-amber-500 p-2">
            <div className="border-2 border-red-600 p-4 crt-glow-red">
              <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-amber-500">
                <div className="flex items-center gap-3">
                  <span className="text-red-600 animate-blink font-bold text-xl crt-bloom-red">█</span>
                  <span className="text-xs font-mono font-bold text-red-600 tracking-wider crt-bloom-red">
                    *** CRITICAL ALERT ***
                  </span>
                </div>
                <button
                  onClick={() => setShowCriticalCarousel(false)}
                  className="flex items-center justify-center w-8 h-8 border-2 border-amber-500 hover:bg-amber-500 hover:text-black text-amber-500 transition-all font-bold"
                  aria-label="Dismiss"
                >
                  X
                </button>
              </div>

              <div className="space-y-3">
                <div key={criticalCarouselIndex}>
                  <h2 className="text-xl md:text-2xl font-mono font-bold animate-carousel-wipe text-amber-500 mb-2 tracking-wide">
                    &gt; {criticalIncidents[criticalCarouselIndex].call_type}
                  </h2>
                  <p className="text-amber-400 animate-carousel-wipe-delay-1 font-mono text-sm">
                    LOCATION: {criticalIncidents[criticalCarouselIndex].address_raw}
                  </p>
                </div>

                {criticalIncidents.length > 1 && (
                  <div className="flex items-center justify-between pt-3 border-t-2 border-amber-500">
                    <button
                      onClick={() =>
                        setCriticalCarouselIndex(
                          (prev) => (prev - 1 + criticalIncidents.length) % criticalIncidents.length,
                        )
                      }
                      className="flex items-center justify-center w-10 h-10 border-2 border-amber-500 hover:bg-amber-500 hover:text-black text-amber-500 transition-all font-mono font-bold"
                      aria-label="Previous incident"
                    >
                      &lt;
                    </button>

                    <div className="flex items-center gap-2">
                      {criticalIncidents.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCriticalCarouselIndex(idx)}
                          className={`w-3 h-3 border transition-all ${
                            idx === criticalCarouselIndex
                              ? "bg-red-600 border-red-600 crt-bloom-red"
                              : "bg-transparent border-amber-500"
                          }`}
                          aria-label={`View incident ${idx + 1}`}
                        />
                      ))}
                      <span className="ml-2 text-xs text-amber-500 font-mono font-bold">
                        [{criticalCarouselIndex + 1}/{criticalIncidents.length}]
                      </span>
                    </div>

                    <button
                      onClick={() => setCriticalCarouselIndex((prev) => (prev + 1) % criticalIncidents.length)}
                      className="flex items-center justify-center w-10 h-10 border-2 border-amber-500 hover:bg-amber-500 hover:text-black text-amber-500 transition-all font-mono font-bold"
                      aria-label="Next incident"
                    >
                      &gt;
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowCriticalCarousel(false)
                    setSelectedIncident(criticalIncidents[criticalCarouselIndex])
                    setTimeout(() => {
                      if (window.innerWidth < 768) {
                        setShowBottomSheet(true)
                      } else {
                        setShowBottomSheet(false)
                      }
                    }, 600)
                  }}
                  className="w-full bg-amber-500 text-black font-mono font-bold text-base py-4 hover:bg-amber-400 transition-all mt-4 tracking-wider"
                >
                  [ENTER] VIEW DETAILS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No incidents message */}
      {!showBottomSheet && criticalIncidents.length === 0 && filteredItems.length === 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-30 p-8 bg-gradient-to-t from-black/40 via-black/20 to-transparent animate-slide-up pointer-events-none">
          <div className="max-w-2xl mx-auto text-center space-y-6 pointer-events-auto">
            <h1 className="text-3xl md:text-5xl font-bold leading-tight">
              No active incidents happening near you right now
            </h1>
            <p className="text-lg text-gray-400">
              Set up instant alerts to get notified when something happens nearby.
            </p>
            <button
              onClick={() => setShowListView(true)}
              className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-2xl text-black font-bold text-lg py-4 rounded-full hover:bg-white transition-all shadow-2xl"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {selectedIncident && !showBottomSheet && (
        <div className="hidden md:block absolute inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-auto">
            <div className="absolute inset-0 bg-black/90 animate-fade-in" onClick={() => setSelectedIncident(null)} />

            <div className="relative bg-black border-4 border-amber-500 p-1 max-w-2xl w-full animate-modal-in">
              <div className="border-2 border-amber-500 p-6">
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="absolute top-4 right-4 w-8 h-8 border-2 border-amber-500 hover:bg-amber-500 hover:text-black text-amber-500 transition-all font-mono font-bold"
                >
                  X
                </button>

                <div className="space-y-4 font-mono">
                  <div className="border-b-2 border-amber-500 pb-3">
                    <div
                      className="inline-block px-3 py-1 border-2 text-xs font-bold mb-3 tracking-wider"
                      style={{
                        borderColor: getPriorityColor(selectedIncident.priority),
                        color: getPriorityColor(selectedIncident.priority),
                      }}
                    >
                      [{getPriorityLabel(selectedIncident.priority)}]
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-amber-500 tracking-wide">
                      &gt; {selectedIncident.call_type}
                    </h2>
                    <p className="text-amber-400 text-sm">LOCATION: {selectedIncident.address_raw || "UNKNOWN"}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <div className="text-xs text-amber-500/70 mb-1 tracking-wider">AREA:</div>
                      <div className="font-bold text-amber-500">{selectedIncident.area || "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-amber-500/70 mb-1 tracking-wider">TIME:</div>
                      <div className="font-bold text-amber-500">
                        {new Date(selectedIncident.received_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  {selectedIncident.disposition && (
                    <div className="pt-2 border-t-2 border-amber-500">
                      <div className="text-xs text-amber-500/70 mb-1 tracking-wider">STATUS:</div>
                      <div className="font-bold text-amber-500">{selectedIncident.disposition}</div>
                    </div>
                  )}

                  <div className="pt-2 border-t-2 border-amber-500">
                    <div className="text-xs text-amber-500/70 mb-1 tracking-wider">INCIDENT ID:</div>
                    <div className="text-sm text-amber-400">{selectedIncident.incident_id}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedIncident && showBottomSheet && (
        <div className="md:hidden absolute inset-0 z-50 flex items-end animate-slide-up">
          <div
            className="absolute inset-0 bg-black/90"
            onClick={() => {
              setShowBottomSheet(false)
              setSelectedIncident(null)
            }}
          />

          <div className="relative w-full max-h-[80vh] bg-black border-t-4 border-amber-500 overflow-hidden">
            <div className="flex justify-center py-3 border-b-2 border-amber-500">
              <div className="w-12 h-1 bg-amber-500" />
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(80vh-3rem)] font-mono">
              <button
                onClick={() => {
                  setShowBottomSheet(false)
                  setSelectedIncident(null)
                }}
                className="absolute top-6 right-6 w-8 h-8 border-2 border-amber-500 hover:bg-amber-500 hover:text-black text-amber-500 transition-all font-bold"
              >
                X
              </button>

              <div className="border-b-2 border-amber-500 pb-3">
                <div
                  className="inline-block px-3 py-1 border-2 text-xs font-bold mb-3 tracking-wider"
                  style={{
                    borderColor: getPriorityColor(selectedIncident.priority),
                    color: getPriorityColor(selectedIncident.priority),
                  }}
                >
                  [{getPriorityLabel(selectedIncident.priority)}]
                </div>
                <h2 className="text-xl font-bold mb-2 text-amber-500 tracking-wide">
                  &gt; {selectedIncident.call_type}
                </h2>
                <p className="text-amber-400 text-sm">LOCATION: {selectedIncident.address_raw || "UNKNOWN"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-amber-500/70 mb-1 tracking-wider">AREA:</div>
                  <div className="font-bold text-amber-500">{selectedIncident.area || "N/A"}</div>
                </div>
                <div>
                  <div className="text-xs text-amber-500/70 mb-1 tracking-wider">TIME:</div>
                  <div className="font-bold text-amber-500">
                    {new Date(selectedIncident.received_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {selectedIncident.disposition && (
                <div className="pt-2 border-t-2 border-amber-500">
                  <div className="text-xs text-amber-500/70 mb-1 tracking-wider">STATUS:</div>
                  <div className="font-bold text-amber-500">{selectedIncident.disposition}</div>
                </div>
              )}

              <div className="pt-2 border-t-2 border-amber-500">
                <div className="text-xs text-amber-500/70 mb-1 tracking-wider">INCIDENT ID:</div>
                <div className="text-sm text-amber-400">{selectedIncident.incident_id}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showListView && (
        <IncidentListView
          items={filteredItems}
          onClose={() => setShowListView(false)}
          onSelectIncident={(incident) => {
            setSelectedIncident(incident)
            setShowBottomSheet(true)
          }}
          getPriorityLabel={getPriorityLabel}
          getPriorityColor={getPriorityColor}
        />
      )}

      <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center pointer-events-none">
        <div className="pointer-events-auto bg-black border-2 border-amber-500 px-4 py-2">
          <a
            href="https://circlecreativegroup.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-amber-500 hover:text-amber-400 transition-colors font-mono tracking-wider font-bold"
          >
            [BUILT BY CIRCLE CREATIVE GROUP]
          </a>
        </div>
      </div>
    </div>
  )
}
