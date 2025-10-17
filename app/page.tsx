"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import FilterPanel from "@/components/filter-panel"
import LandingPage from "@/components/landing-page"
import IncidentListView from "@/components/incident-list-view"
import TerminalLoading from "@/components/terminal-loading"
import ThemeSwitcher from "@/components/theme-switcher"
import { fetchIncidents, type IncidentsResponse } from "@/lib/api/incidents"
import { X, ChevronLeft, ChevronRight, Filter } from "lucide-react"

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
  // UI state - Always start with landing page on server, check URL on client
  const [showLanding, setShowLanding] = useState(true)
  const [showListView, setShowListView] = useState(false)
  const [showBottomSheet, setShowBottomSheet] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [locationPermission, setLocationPermission] = useState<'pending' | 'granted' | 'denied'>('pending')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState<{stage: string; current?: number; total?: number} | null>(null)
  const [showFilterSheet, setShowFilterSheet] = useState(false)  // Mobile filter sheet state
  const [hasInitialLoad, setHasInitialLoad] = useState(false)  // Track if we've loaded data at least once

  // Data state
  const [items, setItems] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [minPriority, setMinPriority] = useState(100)
  const [timeRange, setTimeRange] = useState(2) // Default to last 2 hours for better UX
  const [searchTags, setSearchTags] = useState<string[]>([])
  const [filterPanelExpanded, setFilterPanelExpanded] = useState(false)

  // Auto-refresh toggle
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)

  // nocache flag from URL
  const [nocache, setNocache] = useState(false)

  // Tab visibility state
  const [isTabVisible, setIsTabVisible] = useState(true)

  // Critical carousel state
  const [criticalCarouselIndex, setCriticalCarouselIndex] = useState(0)
  const [showCriticalCarousel, setShowCriticalCarousel] = useState(true)

  /**
   * Check URL params on client mount to skip landing page if returning
   */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('view') === 'map') {
        setShowLanding(false)
      }
      // Check for nocache parameter
      if (params.get('nocache') === '1' || params.get('nocache') === 'true') {
        setNocache(true)
      }
    }
  }, [])

  /**
   * Handle tab visibility changes to pause/resume polling
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden)
      console.log('[PAGE] Tab visibility changed:', !document.hidden ? 'visible' : 'hidden')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  /**
   * Handles entering the map view from landing page
   * Updates URL to persist map view on refresh
   * Location permission will be requested by the map component
   */
  const handleEnterMapView = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('view', 'map')
    window.history.pushState({}, '', url)
    setShowLanding(false)
  }

  /**
   * Callback when location permission is granted/denied
   */
  const handleLocationPermission = (granted: boolean) => {
    setLocationPermission(granted ? 'granted' : 'denied')
    console.log('[PAGE] Location permission:', granted ? 'granted' : 'denied')
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
   * Filters incidents based on time range, search tags, and geographic bounds
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
        return searchTags.some((tag) => itemTags.includes(tag.toLowerCase()))
      })
    }

    // Filter out incidents with coordinates outside Riverside County bounds
    // Riverside County approximate bounds: lat 33.4-34.2, lon -117.8 to -116.8
    filtered = filtered.filter((item) => {
      // Keep incidents without coordinates (they won't show on map anyway)
      if (!item.lat || !item.lon) return true

      // Drop incidents outside Riverside County bounds
      const isInRiverside =
        item.lat >= 33.4 &&
        item.lat <= 34.2 &&
        item.lon >= -117.8 &&
        item.lon <= -116.8

      if (!isInRiverside) {
        console.log('[PAGE] Dropping incident outside Riverside bounds:', {
          id: item.incident_id,
          lat: item.lat,
          lon: item.lon,
          address: item.address_raw
        })
      }

      return isInRiverside
    })

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
   * Calculate number of active filters for the badge
   */
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (selectedCategory) count++
    if (minPriority < 100) count++
    if (timeRange < 999) count++
    count += searchTags.length
    return count
  }, [selectedCategory, minPriority, timeRange, searchTags])

  /**
   * Fetches incidents from API on mount and every 60 seconds
   * Applies time range filter to fetch only relevant data
   */
  useEffect(() => {
    if (showLanding) return

    let active = true
    const abortController = new AbortController()

    const loadIncidents = async () => {
      // Calculate time range for API request
      const now = new Date()
      const since = timeRange < 999
        ? new Date(now.getTime() - timeRange * 60 * 60 * 1000).toISOString()
        : undefined

      console.log('[PAGE] Loading incidents with filters:', {
        selectedCategory,
        minPriority,
        timeRange,
        since,
        geocode: true,
        nocache
      })

      setLoading(true)
      setError(null)
      // Only set isRefreshing if we already have data (this is a refresh, not initial load)
      if (hasInitialLoad) {
        setIsRefreshing(true)
      }
      setLoadingProgress({ stage: 'Fetching' })

      try {
        // Show geocoding stage after 1 second (gives time for API fetch to complete)
        const geocodeTimer = setTimeout(() => {
          if (active) {
            setLoadingProgress({ stage: 'Geocoding' })
          }
        }, 1000)

        const data = await fetchIncidents({
          callCategory: selectedCategory || undefined,
          minPriority,
          since,
          geocode: true, // Enable geocoding to show markers on map
          nocache
        }, {
          signal: abortController.signal
        })

        clearTimeout(geocodeTimer)

        console.log('[PAGE] Received data:', {
          count: data.count,
          itemsLength: data.items?.length,
          firstItem: data.items?.[0]
        })

        if (!active) return
        setLoadingProgress({ stage: 'Rendering', current: data.items?.length, total: data.items?.length })
        setItems((data.items || []) as Incident[])
        setHasInitialLoad(true)  // Mark that we've loaded data at least once
        console.log('[PAGE] Set items state:', data.items?.length || 0)
      } catch (err: any) {
        // Don't show error if request was aborted (filter changed)
        if (err.name === 'AbortError') {
          console.log('[PAGE] Request aborted (filter changed)')
          return
        }
        console.error('[PAGE] Error loading incidents:', err)
        if (!active) return
        setError(err?.message || "Failed to load incidents")
        setItems([])
      } finally {
        if (active) {
          setLoading(false)
          setIsRefreshing(false)
          setLoadingProgress(null)
        }
      }
    }

    loadIncidents()

    // Auto-refresh every 60 seconds if enabled and tab is visible
    let interval: NodeJS.Timeout | null = null
    if (autoRefreshEnabled && isTabVisible) {
      interval = setInterval(() => {
        // Double-check tab visibility before refreshing
        if (document && !document.hidden) {
          console.log('[PAGE] Auto-refreshing data (60s interval)')
          loadIncidents()
        }
      }, 60000)
    }

    return () => {
      active = false
      abortController.abort() // Cancel in-flight request when filters change
      if (interval) clearInterval(interval)
    }
  }, [selectedCategory, minPriority, timeRange, showLanding, autoRefreshEnabled, nocache, isTabVisible])

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

      {/* Top navigation bar - Amber MDT style */}
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
              onClick={() => setShowFilterSheet(true)}
              className="md:hidden flex items-center gap-2 text-xs font-mono text-amber-500 border-2 border-amber-500 px-3 py-1 hover:bg-amber-500 hover:text-black transition-all"
            >
              <span>FILTERS</span>
            </button>
            <button
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className="flex items-center gap-2 text-xs font-mono text-amber-500 border-2 border-amber-500 px-3 py-1 hover:bg-amber-500 hover:text-black transition-all"
            >
              <span className={autoRefreshEnabled ? "animate-blink" : "opacity-50"}>█</span>
              <span className={autoRefreshEnabled ? "" : "opacity-50"}>{autoRefreshEnabled ? "ONLINE" : "OFFLINE"}</span>
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
          onLocationPermission={handleLocationPermission}
          isRefreshing={isRefreshing}
          sidePanelOpen={!showBottomSheet && (showListView || !!selectedIncident)}
          panelWidth={showListView ? 500 : 320}
          showBottomSheet={showBottomSheet}
        />
      </div>

      {/* Right-side HUD stack - Terminal style */}
      <div className="absolute top-20 right-6 z-30 flex flex-col items-end gap-3">
        {/* Location disabled indicator */}
        {locationPermission === 'denied' && (
          <div className="flex items-center gap-2 bg-black/80 backdrop-blur-2xl terminal-border rounded-lg px-4 py-2 shadow-lg">
            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              <line x1="15" y1="9" x2="9" y2="15" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
            <span className="text-xs font-mono tracking-wider text-yellow-400">LOCATION DISABLED</span>
          </div>
        )}

        {/* Incident count button */}
        <button
          onClick={() => setShowListView(true)}
          disabled={loading || isRefreshing}
          className={`relative bg-black/80 backdrop-blur-2xl terminal-border rounded-lg px-6 py-3 text-sm font-mono tracking-wide transition-all shadow-2xl ${
            (loading || isRefreshing)
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-green-500/10 cursor-pointer'
          }`}
        >
          <div className="terminal-scanlines" />
          <span className="text-green-400 terminal-text">
            {selectedCategory ? selectedCategory.toUpperCase() : "ALL INCIDENTS"} • {filteredItems.length}
          </span>
        </button>
      </div>

      {/* Left-side HUD stack - Terminal style */}
      <div className="absolute top-20 left-6 z-[70] flex flex-col items-start gap-3">
        {/* LIVE indicator badge - toggle for auto-refresh */}
        <button
          onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
          disabled={loading || isRefreshing}
          className={`relative flex items-center gap-2 backdrop-blur-2xl terminal-border rounded-lg px-4 py-2 shadow-lg transition-all ${
            (loading || isRefreshing)
              ? 'cursor-not-allowed'
              : 'hover:scale-105 cursor-pointer'
          } ${
            autoRefreshEnabled
              ? `bg-black/80 ${isRefreshing ? 'scale-110' : ''}`
              : 'bg-black/80'
          }`}
          title={autoRefreshEnabled ? 'Auto-refresh ON (click to disable)' : 'Auto-refresh OFF (click to enable)'}
        >
          <div className="terminal-scanlines" />
          {isRefreshing || loading ? (
            <svg className="w-3 h-3 animate-spin text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <div className={`w-2 h-2 rounded-full ${
              autoRefreshEnabled ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
            }`} />
          )}
          <span className="text-xs font-mono tracking-wider whitespace-nowrap terminal-text text-green-400">
            {loading || isRefreshing ? (
              loadingProgress ? (
                loadingProgress.current && loadingProgress.total ? (
                  `${loadingProgress.stage} ${loadingProgress.current}/${loadingProgress.total}`
                ) : (
                  loadingProgress.stage
                )
              ) : (
                loading ? 'LOADING' : 'UPDATING'
              )
            ) : (
              autoRefreshEnabled ? 'LIVE' : 'PAUSED'
            )}
          </span>
        </button>

        {/* Critical alerts toggle button */}
        {criticalIncidents.length > 0 && (
          <button
            onClick={() => setShowCriticalCarousel(!showCriticalCarousel)}
            className={`relative flex items-center gap-2 backdrop-blur-2xl terminal-border rounded-lg px-4 py-2 shadow-lg transition-all hover:scale-105 cursor-pointer bg-black/80`}
            title={showCriticalCarousel ? 'Hide critical alerts carousel' : 'Show critical alerts carousel'}
          >
            <div className="terminal-scanlines" />
            <div className={`w-2 h-2 rounded-full ${
              showCriticalCarousel ? 'bg-red-500 animate-pulse-red' : 'bg-yellow-500'
            }`} />
            <span className="text-xs font-mono tracking-wider whitespace-nowrap text-red-400 terminal-text">
              {criticalIncidents.length} CRITICAL
            </span>
          </button>
        )}

        {/* Theme Switcher */}
        <ThemeSwitcher />

        {/* Filter panel - hidden on mobile */}
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
      </div>

      {/* Terminal loading overlay - only show on initial load, not refreshes */}
      {loading && !isRefreshing && <TerminalLoading />}

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
                <span className="text-sm tracking-wider text-red-500">CRITICAL ALERT</span>
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
                <h2 className="text-2xl md:text-3xl animate-carousel-wipe">
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
                  // Set selected incident first to trigger map zoom
                  setSelectedIncident(criticalIncidents[criticalCarouselIndex])

                  // Dismiss carousel and show mobile sheet if needed
                  setShowCriticalCarousel(false)
                  if (window.innerWidth < 768) {
                    setShowBottomSheet(true)
                  }
                }}
                className="w-full bg-white/95 backdrop-blur-xl text-red-600 text-lg py-4 rounded-full hover:bg-white transition-all shadow-xl mt-4"
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
            <h1 className="text-3xl md:text-5xl leading-tight">
              No active incidents happening near you right now
            </h1>
            <p className="text-lg text-gray-400">
              Set up instant alerts to get notified when something happens nearby.
            </p>
            <button
              onClick={() => setShowListView(true)}
              disabled={loading && !hasInitialLoad}
              className={`w-full max-w-md mx-auto backdrop-blur-2xl text-lg py-4 rounded-full transition-all shadow-2xl ${
                loading && !hasInitialLoad
                  ? 'bg-white/50 text-black/50 cursor-not-allowed'
                  : 'bg-white/95 text-black hover:bg-white cursor-pointer'
              }`}
            >
              {loading && !hasInitialLoad ? 'Loading...' : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {/* Incident detail popup panel for desktop */}
      {selectedIncident && !showBottomSheet && (
        <div className="hidden md:block absolute top-20 right-6 z-40 w-80 pointer-events-none">
          <div
            className="relative bg-black/60 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-2xl pointer-events-auto animate-modal-in overflow-hidden"
            style={{
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) inset",
            }}
          >
            <div className="p-6 space-y-4">
              <button
                onClick={() => setSelectedIncident(null)}
                className="flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-all mb-4"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <div
                  className="inline-block px-3 py-1 rounded-full text-xs mb-3"
                  style={{
                    backgroundColor: getPriorityColor(selectedIncident.priority) + "30",
                    color: getPriorityColor(selectedIncident.priority),
                  }}
                >
                  {getPriorityLabel(selectedIncident.priority)} PRIORITY
                </div>
                <h2 className="text-2xl leading-tight mb-2">{selectedIncident.call_type}</h2>
                <button
                  onClick={() => {
                    // Re-trigger the zoom by clearing and re-setting the incident
                    const incident = selectedIncident
                    setSelectedIncident(null)
                    setTimeout(() => setSelectedIncident(incident), 50)
                  }}
                  className="text-left text-gray-400 hover:text-white transition-colors group"
                  title="Click to refocus on map"
                >
                  <span className="group-hover:underline">{selectedIncident.address_raw || "No address available"}</span>
                </button>
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

      {/* Incident detail sheet for mobile */}
      {selectedIncident && showBottomSheet && (
        <div className="md:hidden absolute bottom-0 left-0 right-0 z-40 animate-slide-up">
          <div
            className="relative w-full h-[45vh] bg-black/60 backdrop-blur-3xl border-t border-white/20 rounded-t-3xl shadow-2xl overflow-hidden"
            style={{
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              boxShadow: "0 -8px 32px 0 rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) inset",
            }}
          >
            <div className="flex justify-center py-3">
              <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
            </div>

            <div className="p-6 pb-12 space-y-4 overflow-y-auto h-[calc(45vh-2rem)]">
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
                  className="inline-block px-3 py-1 rounded-full text-xs mb-3"
                  style={{
                    backgroundColor: getPriorityColor(selectedIncident.priority) + "30",
                    color: getPriorityColor(selectedIncident.priority),
                  }}
                >
                  {getPriorityLabel(selectedIncident.priority)} PRIORITY
                </div>
                <h2 className="text-2xl leading-tight mb-2">{selectedIncident.call_type}</h2>
                <div className="text-left text-gray-400">
                  {selectedIncident.address_raw || "No address available"}
                </div>
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

      {/* Mobile Filter Sheet */}
      {showFilterSheet && (
        <div className="md:hidden absolute inset-0 z-50 flex items-end animate-slide-up">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            style={{ WebkitBackdropFilter: "blur(8px)" }}
            onClick={() => setShowFilterSheet(false)}
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg">FILTERS</h3>
                <button
                  onClick={() => setShowFilterSheet(false)}
                  className="flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-all"
                  aria-label="Close filters"
                >
                  <X className="w-4 h-4" />
                </button>
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
                isExpanded={true}
                onExpandedChange={() => {}}
              />

              <button
                onClick={() => setShowFilterSheet(false)}
                className="w-full bg-white/95 backdrop-blur-xl text-black text-base py-3 rounded-full hover:bg-white transition-all shadow-xl mt-6"
              >
                Apply Filters ({filteredItems.length} results)
              </button>
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
            // On mobile: close list and show bottom sheet
            if (window.innerWidth < 768) {
              setShowListView(false)
              setShowBottomSheet(true)
            }
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
          Built with ♥ by Circle Creative Group • v1.0
        </a>
      </div>
    </div>
  )
}
