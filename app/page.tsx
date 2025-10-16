"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import FilterPanel from "@/components/filter-panel"
import LandingPage from "@/components/landing-page"
import IncidentListView from "@/components/incident-list-view"
import { fetchIncidents, type IncidentsResponse } from "@/lib/api/incidents"
import { X, ChevronLeft, ChevronRight } from "lucide-react"

type Incident = IncidentsResponse["items"][number]

/**
 * Category color mapping for incident classification
 * Used to color-code markers and badges throughout the app
 */
const CATEGORY_COLORS: Record<string, string> = {
  violent: "#ef4444",
  weapons: "#f97316",
  property: "#f59e0b",
  traffic: "#84cc16",
  disturbance: "#eab308",
  drug: "#a855f7",
  medical: "#ec4899",
  admin: "#6b7280",
  other: "#9ca3af",
}

// Dynamically import LeafletMap to avoid SSR issues with Leaflet
const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0f1419]">
      <div className="text-gray-400">Loading map...</div>
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
  const [showListView, setShowListView] = useState(false)
  const [showBottomSheet, setShowBottomSheet] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)

  // Data state
  const [items, setItems] = useState<Incident[]>([])
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
    if (priority <= 20) return "#ef4444"
    if (priority <= 40) return "#f97316"
    if (priority <= 60) return "#eab308"
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
   * Fetches incidents from API on mount and every 60 seconds
   */
  useEffect(() => {
    if (showLanding) return

    let active = true

    const loadIncidents = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchIncidents({
          callCategory: selectedCategory || undefined,
          minPriority,
          geocode: true
        })
        if (!active) return
        setItems((data.items || []) as Incident[])
      } catch (err: any) {
        if (!active) return
        setError(err?.message || "Failed to load incidents")
        setItems([])
      } finally {
        if (active) setLoading(false)
      }
    }

    loadIncidents()
    const interval = setInterval(loadIncidents, 60000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [selectedCategory, minPriority, showLanding])

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

  if (showLanding) {
    return <LandingPage onEnter={handleEnterMapView} />
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0a0e14]">
      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] z-0"
        style={{
          backgroundImage: `
            linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent),
            linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Top navigation bar */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="text-sm font-semibold tracking-wider"></div>
        <div className="text-sm font-bold tracking-wider">RIVERSIDE INCIDENTS</div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 flex gap-0.5">
            <div className="w-1 h-full bg-white rounded-sm" />
            <div className="w-1 h-full bg-white rounded-sm" />
            <div className="w-1 h-full bg-white rounded-sm" />
            <div className="w-1 h-full bg-white/50 rounded-sm" />
          </div>
        </div>
      </div>

      {/* Main map view */}
      <div className="absolute inset-0 bg-[#0a0e14] z-10">
        <LeafletMap
          items={filteredItems}
          onMarkerClick={(item) => {
            setSelectedIncident(item)
            if (window.innerWidth < 768) {
              setShowBottomSheet(true)
            }
          }}
          selectedIncident={selectedIncident}
        />
      </div>

      {/* Filter panel */}
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
      />

      {/* LIVE indicator badge */}
      <div className="absolute top-20 left-6 z-30 flex items-center gap-2 bg-red-500/20 backdrop-blur-2xl border border-red-500/30 rounded-full px-4 py-2 shadow-lg">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse-red" />
        <span className="text-xs font-bold tracking-wider">LIVE</span>
      </div>

      {/* Incident count button */}
      <button
        onClick={() => setShowListView(true)}
        className="absolute top-24 right-6 z-40 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full px-6 py-3 text-sm font-bold tracking-wide hover:bg-white/20 transition-all shadow-2xl"
      >
        {selectedCategory ? selectedCategory.toUpperCase() : "ALL INCIDENTS"} • {filteredItems.length}
      </button>

      {/* Critical incidents carousel - Added navigation buttons */}
      {criticalIncidents.length > 0 && showCriticalCarousel && !showBottomSheet && (
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 md:p-6 bg-gradient-to-t from-black/60 via-black/30 to-transparent animate-slide-up">
          <div
            className="max-w-2xl mx-auto bg-black/60 backdrop-blur-3xl border border-white/20 rounded-3xl p-6 shadow-2xl"
            style={{
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) inset",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse-red" />
                <span className="text-sm font-bold tracking-wider text-red-500">CRITICAL ALERT</span>
              </div>
              <button
                onClick={() => setShowCriticalCarousel(false)}
                className="flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-all"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div key={criticalCarouselIndex}>
                <h2 className="text-2xl md:text-3xl font-bold animate-carousel-wipe">
                  {criticalIncidents[criticalCarouselIndex].call_type}
                </h2>
                <p className="text-white/90 animate-carousel-wipe-delay-1">
                  {criticalIncidents[criticalCarouselIndex].address_raw}
                </p>
              </div>

              {criticalIncidents.length > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() =>
                      setCriticalCarouselIndex(
                        (prev) => (prev - 1 + criticalIncidents.length) % criticalIncidents.length,
                      )
                    }
                    className="flex items-center justify-center w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-all"
                    aria-label="Previous incident"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-2">
                    {criticalIncidents.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCriticalCarouselIndex(idx)}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === criticalCarouselIndex ? "w-8 bg-red-500" : "w-1.5 bg-white/40"
                        }`}
                        aria-label={`View incident ${idx + 1}`}
                      />
                    ))}
                    <span className="ml-2 text-xs text-white/60">
                      {criticalCarouselIndex + 1} of {criticalIncidents.length}
                    </span>
                  </div>

                  <button
                    onClick={() => setCriticalCarouselIndex((prev) => (prev + 1) % criticalIncidents.length)}
                    className="flex items-center justify-center w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-all"
                    aria-label="Next incident"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  // Dismiss carousel immediately
                  setShowCriticalCarousel(false)
                  setSelectedIncident(criticalIncidents[criticalCarouselIndex])

                  // Delay showing the detail view to allow map to pan/zoom first
                  setTimeout(() => {
                    if (window.innerWidth < 768) {
                      setShowBottomSheet(true)
                    } else {
                      setShowBottomSheet(false)
                    }
                  }, 600)
                }}
                className="w-full bg-white/95 backdrop-blur-xl text-red-600 font-bold text-lg py-4 rounded-full hover:bg-white transition-all shadow-xl mt-4"
              >
                View Details
              </button>
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

      {/* Incident detail modal for desktop */}
      {selectedIncident && !showBottomSheet && (
        <div className="hidden md:block absolute inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-auto">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
              style={{ WebkitBackdropFilter: "blur(8px)" }}
              onClick={() => setSelectedIncident(null)}
            />

            <div
              className="relative bg-black/60 backdrop-blur-3xl border border-white/20 rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-modal-in"
              style={{
                backdropFilter: "blur(40px) saturate(180%)",
                WebkitBackdropFilter: "blur(40px) saturate(180%)",
                boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) inset",
              }}
            >
              <button
                onClick={() => setSelectedIncident(null)}
                className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-4">
                <div>
                  <div
                    className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-3"
                    style={{
                      backgroundColor: getPriorityColor(selectedIncident.priority) + "30",
                      color: getPriorityColor(selectedIncident.priority),
                    }}
                  >
                    {getPriorityLabel(selectedIncident.priority)} PRIORITY
                  </div>
                  <h2 className="text-2xl font-bold leading-tight mb-2">{selectedIncident.call_type}</h2>
                  <p className="text-gray-400">{selectedIncident.address_raw || "No address available"}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Area</div>
                    <div className="font-semibold">{selectedIncident.area || "Unknown"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Time</div>
                    <div className="font-semibold">{new Date(selectedIncident.received_at).toLocaleTimeString()}</div>
                  </div>
                </div>

                {selectedIncident.disposition && (
                  <div className="pt-4 border-t border-gray-700">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</div>
                    <div className="font-semibold">{selectedIncident.disposition}</div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-700">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Incident ID</div>
                  <div className="font-mono text-sm text-gray-400">{selectedIncident.incident_id}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incident detail sheet for mobile */}
      {selectedIncident && showBottomSheet && (
        <div className="md:hidden absolute inset-0 z-50 flex items-end animate-slide-up">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            style={{ WebkitBackdropFilter: "blur(8px)" }}
            onClick={() => {
              setShowBottomSheet(false)
              setSelectedIncident(null)
            }}
          />

          <div
            className="relative w-full max-h-[80vh] bg-black/60 backdrop-blur-3xl border-t border-white/20 rounded-t-3xl shadow-2xl overflow-hidden"
            style={{
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              boxShadow: "0 -8px 32px 0 rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) inset",
            }}
          >
            <div className="flex justify-center py-3">
              <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(80vh-2rem)]">
              <button
                onClick={() => {
                  setShowBottomSheet(false)
                  setSelectedIncident(null)
                }}
                className="absolute top-6 right-6 flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <div
                  className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-3"
                  style={{
                    backgroundColor: getPriorityColor(selectedIncident.priority) + "30",
                    color: getPriorityColor(selectedIncident.priority),
                  }}
                >
                  {getPriorityLabel(selectedIncident.priority)} PRIORITY
                </div>
                <h2 className="text-2xl font-bold leading-tight mb-2">{selectedIncident.call_type}</h2>
                <p className="text-gray-400">{selectedIncident.address_raw || "No address available"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Area</div>
                  <div className="font-semibold">{selectedIncident.area || "Unknown"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Time</div>
                  <div className="font-semibold">{new Date(selectedIncident.received_at).toLocaleTimeString()}</div>
                </div>
              </div>

              {selectedIncident.disposition && (
                <div className="pt-4 border-t border-gray-700">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</div>
                  <div className="font-semibold">{selectedIncident.disposition}</div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-700">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Incident ID</div>
                <div className="font-mono text-sm text-gray-400">{selectedIncident.incident_id}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List view for browsing incidents */}
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

      {/* Footer credit */}
      <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center pointer-events-none">
        <a
          href="https://circlecreativegroup.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-white/40 hover:text-white/60 transition-colors pointer-events-auto bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/5"
        >
          Built with ♥ by Circle Creative Group
        </a>
      </div>
    </div>
  )
}
