"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import FilterPanel from "@/components/filter-panel"
import LandingPage from "@/components/landing-page"
import IncidentListView from "@/components/incident-list-view"
import TerminalLoading from "@/components/terminal-loading"
import { fetchIncidents, type IncidentsResponse } from "@/lib/api/incidents"
import { X, ChevronLeft, ChevronRight, Filter, MapPin, AlertTriangle } from "lucide-react"

type Incident = IncidentsResponse["items"][number]

/**
 * Category color mapping for incident classification
 * Used to color-code markers and badges throughout the app
 */
const CATEGORY_COLORS: Record<string, string> = {
  violent: "#ef4444",      // Red - critical
  weapons: "#f97316",      // Orange - serious
  property: "#f59e0b",     // Amber - moderate
  traffic: "#84cc16",      // Lime green - routine
  disturbance: "#eab308",  // Yellow - moderate
  drug: "#a855f7",         // Purple - specific
  admin: "#06b6d4",        // Cyan - administrative
  medical: "#ec4899",      // Pink - medical
  fire: "#f43f5e",         // Rose - fire/emergency
  other: "#64748b",        // Slate gray - miscellaneous
  "public service": "#0ea5e9", // Sky blue - public service
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
  const [mobileSheetType, setMobileSheetType] = useState<'filters' | 'incidents' | 'critical' | null>(null)  // Track which mobile sheet is open
  const [sheetDragOffset, setSheetDragOffset] = useState(0)  // Track drag position for bottom sheet

  // Data state
  const [items, setItems] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [minPriority, setMinPriority] = useState(100)
  const [timeRange, setTimeRange] = useState(3) // Default to last 3 hours for better UX
  const [searchTags, setSearchTags] = useState<string[]>([])
  const [filterPanelExpanded, setFilterPanelExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [mobileFilterSearchInput, setMobileFilterSearchInput] = useState("")

  // Auto-refresh toggle
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)

  // Time range options for filters
  const TIME_RANGES = [
    { label: "1h", hours: 1 },
    { label: "3h", hours: 3 },
    { label: "6h", hours: 6 },
    { label: "12h", hours: 12 },
    { label: "24h", hours: 24 },
    { label: "48h", hours: 48 },
    { label: "All", hours: 999 },
  ]

  // nocache flag from URL
  const [nocache, setNocache] = useState(false)

  // Tab visibility state
  const [isTabVisible, setIsTabVisible] = useState(true)

  // Critical carousel state
  const [criticalCarouselIndex, setCriticalCarouselIndex] = useState(0)
  const [showCriticalCarousel, setShowCriticalCarousel] = useState(true)

  // Map position state
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined)
  const [mapZoom, setMapZoom] = useState<number | undefined>(undefined)

  /**
   * Helper functions for mobile filter tag management
   */
  const handleAddTag = (tag: string) => {
    if (!searchTags.includes(tag)) {
      setSearchTags([...searchTags, tag])
    }
    setMobileFilterSearchInput("")
  }

  const handleRemoveTag = (tag: string) => {
    setSearchTags(searchTags.filter((t) => t !== tag))
  }

  const filteredSuggestions = useMemo(() => {
    return availableTags.filter(
      (tag) => tag.toLowerCase().includes(mobileFilterSearchInput.toLowerCase()) && !searchTags.includes(tag),
    )
  }, [availableTags, mobileFilterSearchInput, searchTags])

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
      // Read search query from URL
      const searchParam = params.get('search')
      if (searchParam) {
        setSearchQuery(searchParam)
      }
      // Read map position from URL
      const latParam = params.get('lat')
      const lonParam = params.get('lon')
      const zoomParam = params.get('zoom')
      if (latParam && lonParam) {
        const lat = parseFloat(latParam)
        const lon = parseFloat(lonParam)
        if (!isNaN(lat) && !isNaN(lon)) {
          setMapCenter([lat, lon])
        }
      }
      if (zoomParam) {
        const zoom = parseFloat(zoomParam)
        if (!isNaN(zoom)) {
          setMapZoom(zoom)
        }
      }
      // Read panel state from URL
      const panelParam = params.get('panel')
      if (panelParam === 'incidents') {
        if (window.innerWidth < 768) {
          setMobileSheetType('incidents')
        } else {
          setShowListView(true)
        }
      } else if (panelParam === 'critical') {
        if (window.innerWidth < 768) {
          setMobileSheetType('critical')
        }
      }
      // Read incident ID from URL (do this after items are loaded)
      const incidentParam = params.get('incident')
      if (incidentParam) {
        // We'll restore this after items are loaded in another useEffect
        console.log('[PAGE] URL has incident ID to restore:', incidentParam)
      }
    }
  }, [])

  /**
   * Sync search query to URL params
   */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (searchQuery) {
        params.set('search', searchQuery)
      } else {
        params.delete('search')
      }
      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchQuery])

  /**
   * Restore selected incident from URL after items are loaded
   */
  useEffect(() => {
    if (typeof window !== 'undefined' && items.length > 0) {
      const params = new URLSearchParams(window.location.search)
      const incidentId = params.get('incident')
      if (incidentId && !selectedIncident) {
        const incident = items.find(i => i.incident_id === incidentId)
        if (incident) {
          console.log('[PAGE] Restoring incident from URL:', incidentId)
          setSelectedIncident(incident)
          if (window.innerWidth < 768) {
            setShowBottomSheet(true)
          }
        }
      }
    }
  }, [items])

  /**
   * Sync panel and incident state to URL
   */
  useEffect(() => {
    if (typeof window === 'undefined' || showLanding) return

    const currentParams = new URLSearchParams(window.location.search)
    const newParams = new URLSearchParams(window.location.search)

    // Track panel state
    if (showListView || mobileSheetType === 'incidents') {
      newParams.set('panel', 'incidents')
    } else if (mobileSheetType === 'critical') {
      newParams.set('panel', 'critical')
    } else {
      newParams.delete('panel')
    }

    // Track incident state
    if (selectedIncident) {
      newParams.set('incident', selectedIncident.incident_id)
    } else {
      newParams.delete('incident')
    }

    // Only update if URL actually changed
    const currentUrl = currentParams.toString()
    const newUrl = newParams.toString()
    if (currentUrl !== newUrl) {
      const fullUrl = `${window.location.pathname}${newUrl ? '?' + newUrl : ''}`
      // Use pushState so back button works
      window.history.pushState({}, '', fullUrl)
      console.log('[PAGE] Updated URL:', fullUrl)
    }
  }, [showListView, mobileSheetType, selectedIncident, showLanding])

  /**
   * Handle browser back/forward navigation
   */
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return

      const params = new URLSearchParams(window.location.search)
      const panelParam = params.get('panel')
      const incidentParam = params.get('incident')

      console.log('[PAGE] Popstate - panel:', panelParam, 'incident:', incidentParam)

      // Restore panel state
      if (panelParam === 'incidents') {
        if (window.innerWidth < 768) {
          setMobileSheetType('incidents')
          setShowListView(false)
        } else {
          setShowListView(true)
          setMobileSheetType(null)
        }
      } else if (panelParam === 'critical') {
        if (window.innerWidth < 768) {
          setMobileSheetType('critical')
        }
        setShowListView(false)
      } else {
        setShowListView(false)
        setMobileSheetType(null)
      }

      // Restore incident state
      if (incidentParam) {
        const incident = items.find(i => i.incident_id === incidentParam)
        if (incident) {
          setSelectedIncident(incident)
          if (window.innerWidth < 768) {
            setShowBottomSheet(true)
          }
        }
      } else {
        setSelectedIncident(null)
        setShowBottomSheet(false)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [items])

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
   * Callback when map moves or zooms - syncs to URL params
   */
  const handleMapMove = (center: [number, number], zoom: number) => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    // Round to 4 decimal places to keep URL clean
    params.set('lat', center[0].toFixed(4))
    params.set('lon', center[1].toFixed(4))
    params.set('zoom', zoom.toFixed(1))

    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState({}, '', newUrl)
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
   * Returns address accuracy tier based on available information
   */
  const getLocationAccuracy = (incident: Incident): string => {
    if (!incident.address_raw) return "APPROXIMATE - AREA ONLY"

    const address = incident.address_raw.trim()

    // Check if it has numbers with redaction stars - most accurate
    if (/^\d+/.test(address) && /\*\*\*/.test(address)) {
      return "APPROXIMATE - BLOCK LEVEL (REDACTED)"
    }

    // Check if it has numbers without stars - moderately accurate
    if (/^\d+/.test(address)) {
      return "APPROXIMATE - BLOCK LEVEL"
    }

    // Check for intersection - less accurate
    if (/\b(AND|&|\/)\b/i.test(address)) {
      return "APPROXIMATE - INTERSECTION"
    }

    // Just area name - least accurate
    return "APPROXIMATE - AREA ONLY"
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
      } else {
        // Only show loading progress on initial load, not refreshes
        setLoadingProgress({ stage: 'FETCHING' })
      }

      try {
        // Show geocoding stage after 1 second (only on initial load)
        let geocodeTimer: NodeJS.Timeout | null = null
        if (!hasInitialLoad) {
          geocodeTimer = setTimeout(() => {
            if (active) {
              setLoadingProgress({ stage: 'GEOCODING' })
            }
          }, 1000)
        }

        const data = await fetchIncidents({
          callCategory: selectedCategory || undefined,
          minPriority,
          since,
          geocode: true, // Enable geocoding to show markers on map
          nocache
        }, {
          signal: abortController.signal
        })

        if (geocodeTimer) clearTimeout(geocodeTimer)

        console.log('[PAGE] Received data:', {
          count: data.count,
          itemsLength: data.items?.length,
          firstItem: data.items?.[0]
        })

        if (!active) return

        // Only show rendering stage on initial load
        if (!hasInitialLoad) {
          setLoadingProgress({ stage: 'RENDERING', current: data.items?.length, total: data.items?.length })
        }

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

  // Show error state if API failed and we have no data
  if (error && !hasInitialLoad && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-amber-500 font-mono p-6">
        <div className="max-w-2xl w-full">
          <div className="border-4 border-amber-500 p-8 space-y-6">
            <div className="border-2 border-amber-500/50 p-6">
              <div className="text-xs text-amber-500/70 uppercase tracking-wider mb-4">╔ CONNECTION ERROR ╗</div>

              <h1 className="text-2xl font-bold mb-4 text-red-600">
                █ UNABLE TO LOAD DATA
              </h1>

              <p className="text-sm mb-6">
                Failed to connect to the incident data service. This could be temporary.
              </p>

              <div className="bg-amber-500/10 border-2 border-amber-500/50 p-4 mb-6">
                <div className="text-xs text-amber-500/70 uppercase tracking-wider mb-2">ERROR DETAILS:</div>
                <code className="text-xs text-amber-400 break-all">
                  {error}
                </code>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setError(null)
                    setLoading(true)
                  }}
                  className="w-full bg-amber-500 text-black py-3 px-6 hover:bg-amber-400 transition-all font-bold tracking-wider"
                >
                  [ENTER] RETRY CONNECTION
                </button>

                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      const url = new URL(window.location.href)
                      url.searchParams.delete('view')
                      url.searchParams.delete('lat')
                      url.searchParams.delete('lon')
                      url.searchParams.delete('zoom')
                      window.location.href = url.toString()
                    }
                  }}
                  className="w-full border-2 border-amber-500 text-amber-500 py-3 px-6 hover:bg-amber-500 hover:text-black transition-all font-bold tracking-wider"
                >
                  [ESC] RETURN TO START
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black no-overscroll">
      {/* Legend - Bottom left corner with hover-to-expand - Hide when loading */}
      {!(loading && !isRefreshing) && (
        <div
          className="absolute left-6 z-20 md:z-40 bg-black border border-amber-500 max-w-xs group hover:max-w-sm transition-all duration-300"
          style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
          onMouseEnter={() => setFilterPanelExpanded(false)}
        >
        <div className="border border-amber-500/50 p-1.5">
          {/* Collapsed state - always visible - much smaller now */}
          <div className="text-[9px] font-mono font-bold text-amber-500 tracking-wider">[LEGEND]</div>

          {/* Expanded content - visible on hover */}
          <div className="space-y-3 text-xs font-mono opacity-0 max-h-0 overflow-hidden group-hover:opacity-100 group-hover:max-h-[500px] transition-all duration-300 group-hover:pt-2 group-hover:mt-2 group-hover:border-t group-hover:border-amber-500">
            {/* Priority levels */}
            <div>
              <div className="text-amber-500/70 mb-2 text-[10px] tracking-wider">PRIORITY LEVELS:</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border" style={{ backgroundColor: "#ef4444", borderColor: "#ef4444", boxShadow: "0 0 4px #ef4444" }} />
                  <span style={{ color: "#ef4444" }} className="text-[9px]">CRITICAL (1-20)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border" style={{ backgroundColor: "#f97316", borderColor: "#f97316", boxShadow: "0 0 4px #f97316" }} />
                  <span style={{ color: "#f97316" }} className="text-[9px]">HIGH (21-40)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border" style={{ backgroundColor: "#eab308", borderColor: "#eab308", boxShadow: "0 0 4px #eab308" }} />
                  <span style={{ color: "#eab308" }} className="text-[9px]">MEDIUM (41-60)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border" style={{ backgroundColor: "#84cc16", borderColor: "#84cc16", boxShadow: "0 0 4px #84cc16" }} />
                  <span style={{ color: "#84cc16" }} className="text-[9px]">LOW (61-80)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border" style={{ backgroundColor: "#06b6d4", borderColor: "#06b6d4", boxShadow: "0 0 4px #06b6d4" }} />
                  <span style={{ color: "#06b6d4" }} className="text-[9px]">ROUTINE (81-100)</span>
                </div>
              </div>
            </div>

            {/* Address accuracy tiers */}
            <div className="pt-2 border-t border-amber-500">
              <div className="text-amber-500/70 mb-2 text-[10px] tracking-wider">ADDRESS ACCURACY:</div>
              <div className="space-y-1">
                <div className="text-[9px] text-amber-500/90">• Block Level (Redacted) - Most accurate</div>
                <div className="text-[9px] text-amber-500/80">• Block Level - Moderately accurate</div>
                <div className="text-[9px] text-amber-500/70">• Intersection - Less accurate</div>
                <div className="text-[9px] text-amber-500/60">• Area Only - Least accurate</div>
              </div>
              <div className="text-[8px] text-amber-500/50 mt-2 leading-relaxed">
                All addresses privacy-redacted by RSO
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Top navigation bar - Amber MDT style - Hide when loading */}
      {!(loading && !isRefreshing) && (
        <div
          className="absolute top-0 left-0 right-0 z-50 bg-black border-b-2 border-amber-500"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
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
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              disabled={loading && !isRefreshing}
              className={`flex items-center gap-2 text-xs font-mono border-2 border-amber-500 px-3 py-1 transition-all ${
                (loading && !isRefreshing)
                  ? 'text-amber-500 cursor-not-allowed'
                  : autoRefreshEnabled
                    ? 'text-amber-500 hover:bg-amber-500 hover:text-black'
                    : 'text-amber-500/50 hover:bg-amber-500 hover:text-black'
              }`}
            >
              {loading && !isRefreshing ? (
                <>
                  <svg className="w-3 h-3 animate-spin text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>
                    {loadingProgress ? (
                      loadingProgress.current && loadingProgress.total ? (
                        `${loadingProgress.stage} ${loadingProgress.current}/${loadingProgress.total}`
                      ) : (
                        loadingProgress.stage
                      )
                    ) : (
                      'LOADING'
                    )}
                  </span>
                </>
              ) : (
                <>
                  <span className={autoRefreshEnabled ? "animate-blink" : ""}>█</span>
                  <span>{autoRefreshEnabled ? "ONLINE" : "OFFLINE"}</span>
                </>
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-2">
          <div className="text-xs font-mono text-amber-500">
            ╚═══════════════════════════════════════════════════════════════════════════════╝
          </div>
        </div>
      </div>
      )}

      {/* Mobile segmented control - iOS style */}
      {!(loading && !isRefreshing) && (
        <div
          className="md:hidden absolute left-0 right-0 z-50 bg-black border-b-2 border-amber-500 px-4 py-3"
          style={{ top: 'calc(92px + env(safe-area-inset-top, 0px))' }}
        >
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-2">
              <button
                onClick={() => {
                  setMobileSheetType(mobileSheetType === 'filters' ? null : 'filters')
                  setShowBottomSheet(false)
                  setSelectedIncident(null)
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 border-2 font-mono text-xs font-bold tracking-wider transition-all ${
                  mobileSheetType === 'filters'
                    ? 'bg-amber-500 text-black border-amber-500'
                    : 'bg-black text-amber-500 border-amber-500 hover:bg-amber-500/10'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>FILTERS</span>
                {activeFilterCount > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold border ${
                    mobileSheetType === 'filters' ? 'bg-black text-amber-500 border-black' : 'bg-amber-500 text-black border-amber-500'
                  }`}>
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setMobileSheetType(mobileSheetType === 'incidents' ? null : 'incidents')
                  setShowBottomSheet(false)
                  setSelectedIncident(null)
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 border-2 font-mono text-xs font-bold tracking-wider transition-all ${
                  mobileSheetType === 'incidents'
                    ? 'bg-amber-500 text-black border-amber-500'
                    : 'bg-black text-amber-500 border-amber-500 hover:bg-amber-500/10'
                }`}
              >
                <span>INCIDENTS</span>
                <span className={`px-1.5 py-0.5 text-[10px] font-bold border ${
                  mobileSheetType === 'incidents' ? 'bg-black text-amber-500 border-black' : 'bg-amber-500 text-black border-amber-500'
                }`}>
                  {filteredItems.length}
                </span>
              </button>
            </div>
            {/* Critical badge - separate from segmented control */}
            {criticalIncidents.length > 0 && (
              <button
                onClick={() => {
                  setMobileSheetType(mobileSheetType === 'critical' ? null : 'critical')
                  setShowBottomSheet(false)
                  setSelectedIncident(null)
                }}
                className={`flex items-center justify-center gap-1 py-2 px-3 border-2 font-mono text-xs font-bold tracking-wider transition-all ${
                  mobileSheetType === 'critical'
                    ? 'bg-red-600 text-black border-red-600'
                    : 'bg-black text-red-600 border-red-600 hover:bg-red-600/10'
                }`}
              >
                <span className={`px-1.5 py-0.5 text-[10px] font-bold border animate-pulse ${
                  mobileSheetType === 'critical'
                    ? 'bg-black text-red-600 border-black'
                    : 'bg-red-600 text-black border-red-600'
                }`}>
                  {criticalIncidents.length}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main map view */}
      <div className="absolute inset-0 bg-black z-10">
        <LeafletMap
          items={filteredItems}
          onMarkerClick={(item) => {
            setSelectedIncident(item)
            if (window.innerWidth < 768) {
              setShowBottomSheet(true)
              setMobileSheetType(null)  // Close mobile segmented sheets
            }
          }}
          selectedIncident={selectedIncident}
          onLocationPermission={handleLocationPermission}
          isRefreshing={isRefreshing}
          sidePanelOpen={!showBottomSheet && (showListView || !!selectedIncident)}
          panelWidth={showListView ? 500 : 320}
          showBottomSheet={showBottomSheet}
          initialCenter={mapCenter}
          initialZoom={mapZoom}
          onMapMove={handleMapMove}
        />
      </div>

      {/* Right-side HUD stack - Terminal style - Hide when loading and on mobile */}
      {!(loading && !isRefreshing) && (
        <div className="hidden md:flex absolute top-32 right-6 z-30 flex-col items-end gap-3">
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

        {/* Incident count and critical alerts - 2 column button */}
        <div className="bg-black border-2 border-amber-500 overflow-hidden">
          <div className="grid grid-cols-2 divide-x-2 divide-amber-500">
            {/* Left column: All incidents */}
            <button
              onClick={() => setShowListView(true)}
              disabled={loading && !isRefreshing}
              className={`group px-6 py-3 text-xs font-mono font-bold transition-all text-amber-500 tracking-wider ${
                (loading && !isRefreshing)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-amber-500 hover:text-black cursor-pointer'
              }`}
            >
              <div className="text-[10px] text-amber-500/70 group-hover:text-black uppercase tracking-wider mb-1 transition-colors">ALL INCIDENTS</div>
              <div className="text-lg font-bold group-hover:text-black transition-colors">{filteredItems.length}</div>
            </button>

            {/* Right column: Critical alerts */}
            <button
              onClick={() => setShowCriticalCarousel(!showCriticalCarousel)}
              disabled={criticalIncidents.length === 0}
              className={`group px-6 py-3 text-xs font-mono font-bold transition-all tracking-wider ${
                criticalIncidents.length === 0
                  ? 'opacity-30 cursor-not-allowed text-amber-500'
                  : showCriticalCarousel
                    ? 'bg-red-600/20 text-red-600 hover:bg-red-600 hover:text-black cursor-pointer'
                    : 'text-amber-500 hover:bg-amber-500 hover:text-black cursor-pointer'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider mb-1 opacity-70 group-hover:text-black group-hover:opacity-100 transition-all">CRITICAL</div>
              <div className="text-lg font-bold flex items-center justify-center gap-2 group-hover:text-black transition-colors">
                {criticalIncidents.length > 0 && (
                  <span className={`w-2 h-2 rounded-full ${showCriticalCarousel ? 'bg-red-600 animate-pulse group-hover:bg-black' : 'bg-amber-500 group-hover:bg-black'}`} />
                )}
                {criticalIncidents.length}
              </div>
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Left-side HUD stack - Terminal style - Desktop only */}
      {!(loading && !isRefreshing) && (
        <div className="hidden md:flex absolute top-32 left-6 z-[70] flex-col items-start gap-3">
        {/* Filter panel - desktop only */}
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
      )}

      {/* Terminal loading overlay - only show on initial load, not refreshes */}
      {loading && !isRefreshing && <TerminalLoading />}

      {/* Critical incidents carousel - Amber MDT style - Desktop only */}
      {criticalIncidents.length > 0 && showCriticalCarousel && !showBottomSheet && !mobileSheetType && (
        <div className="hidden md:block absolute bottom-0 left-0 right-0 z-30 p-4 md:p-6 bg-gradient-to-t from-black via-black/95 to-transparent animate-slide-up">
          <div className="max-w-3xl mx-auto bg-black/80 backdrop-blur-sm border-2 border-amber-500 p-2">
            <div className="border-2 border-red-600 p-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-amber-500">
                <div className="flex items-center gap-3">
                  <span className="text-red-600 animate-blink font-bold text-xl">█</span>
                  <span className="text-xs font-mono font-bold text-red-600 tracking-wider">
                    *** CRITICAL ALERT ***
                  </span>
                </div>
                <button
                  onClick={() => setShowCriticalCarousel(false)}
                  className="flex items-center justify-center w-8 h-8 border-2 border-amber-500 hover:bg-amber-500 hover:text-black text-amber-500 transition-all font-mono font-bold"
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
                    setMobileSheetType(null)  // Close mobile segmented sheets
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

      {/* Incident detail popup panel for desktop - Amber MDT style */}
      {selectedIncident && !showBottomSheet && (
        <div className="hidden md:block absolute top-32 right-6 z-40 w-96 pointer-events-none">
          <div className="relative bg-black border-4 border-amber-500 pointer-events-auto animate-modal-in overflow-hidden">
            <div className="border-2 border-amber-500/50 p-6 space-y-4 font-mono">
              <div className="flex items-center justify-between border-b-2 border-amber-500 pb-3 mb-4">
                <div className="text-xs text-amber-500/70 uppercase tracking-wider">╔ INCIDENT DETAILS ╗</div>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="w-8 h-8 border-2 border-amber-500 hover:bg-amber-500 hover:text-black text-amber-500 transition-all font-bold"
                >
                  X
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {/* Priority badge - colored by priority */}
                  <div
                    className="inline-block px-3 py-1 border-2 text-xs font-bold tracking-wider uppercase"
                    style={{
                      borderColor: getPriorityColor(selectedIncident.priority),
                      color: getPriorityColor(selectedIncident.priority),
                      boxShadow: `0 0 4px ${getPriorityColor(selectedIncident.priority)}40`
                    }}
                  >
                    [P-{selectedIncident.priority} {getPriorityLabel(selectedIncident.priority)}]
                  </div>
                  {/* Category badge */}
                  {selectedIncident.call_category && (
                    <div
                      className="inline-block px-3 py-1 border-2 text-xs font-bold tracking-wider uppercase"
                      style={{
                        borderColor: CATEGORY_COLORS[selectedIncident.call_category] || "#ffb000",
                        color: CATEGORY_COLORS[selectedIncident.call_category] || "#ffb000",
                      }}
                    >
                      [{selectedIncident.call_category}]
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-bold mb-2 text-amber-500 tracking-wide">
                  &gt; {selectedIncident.call_type}
                </h2>
                <button
                  onClick={() => {
                    // Re-trigger the zoom by clearing and re-setting the incident
                    const incident = selectedIncident
                    setSelectedIncident(null)
                    setTimeout(() => setSelectedIncident(incident), 50)
                  }}
                  className="text-left text-amber-400 hover:text-amber-300 transition-colors group text-sm"
                  title="Click to refocus on map"
                >
                  <span className="group-hover:underline">LOCATION: {selectedIncident.address_raw || "UNKNOWN"}</span>
                </button>
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

              <div className="pt-2">
                <div className="text-xs text-amber-500/70 mb-1 tracking-wider">ADDRESS INFO:</div>
                <div className="font-bold text-amber-500">{getLocationAccuracy(selectedIncident)}</div>
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

      {/* Incident detail sheet for mobile - Amber MDT style */}
      {selectedIncident && showBottomSheet && (
        <div className="md:hidden absolute bottom-0 left-0 right-0 z-40 animate-slide-up">
          <div className="relative w-full max-h-[80vh] bg-black border-t-4 border-amber-500 overflow-hidden">
            <div className="flex justify-center py-3 border-b-2 border-amber-500">
              <div className="w-12 h-1 bg-amber-500" />
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(80vh-3rem)] font-mono">
              <div className="flex items-center justify-between border-b-2 border-amber-500 pb-3 mb-4">
                <div className="text-xs text-amber-500/70 uppercase tracking-wider">╔ INCIDENT DETAILS ╗</div>
                <button
                  onClick={() => {
                    setShowBottomSheet(false)
                    setSelectedIncident(null)
                  }}
                  className="w-8 h-8 border-2 border-amber-500 hover:bg-amber-500 hover:text-black text-amber-500 transition-all font-bold"
                >
                  X
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {/* Priority badge - colored by priority */}
                  <div
                    className="inline-block px-3 py-1 border-2 text-xs font-bold tracking-wider uppercase"
                    style={{
                      borderColor: getPriorityColor(selectedIncident.priority),
                      color: getPriorityColor(selectedIncident.priority),
                      boxShadow: `0 0 4px ${getPriorityColor(selectedIncident.priority)}40`
                    }}
                  >
                    [P-{selectedIncident.priority} {getPriorityLabel(selectedIncident.priority)}]
                  </div>
                  {/* Category badge */}
                  {selectedIncident.call_category && (
                    <div
                      className="inline-block px-3 py-1 border-2 text-xs font-bold tracking-wider uppercase"
                      style={{
                        borderColor: CATEGORY_COLORS[selectedIncident.call_category] || "#ffb000",
                        color: CATEGORY_COLORS[selectedIncident.call_category] || "#ffb000",
                      }}
                    >
                      [{selectedIncident.call_category}]
                    </div>
                  )}
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

              <div>
                <div className="text-xs text-amber-500/70 mb-1 tracking-wider">ADDRESS INFO:</div>
                <div className="font-bold text-amber-500">{getLocationAccuracy(selectedIncident)}</div>
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

      {/* Mobile unified bottom sheet - Terminal style with drag support */}
      {mobileSheetType && (
        <div className="md:hidden absolute inset-0 z-50 flex items-end animate-slide-up no-overscroll">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm no-overscroll"
            onClick={() => setMobileSheetType(null)}
            onTouchMove={(e) => e.preventDefault()}
          />

          <div
            className="relative w-full bg-black border-t-4 border-amber-500 overflow-hidden"
            style={{
              maxHeight: '85vh',
              transform: `translateY(${sheetDragOffset}px)`,
              transition: sheetDragOffset === 0 ? 'transform 0.3s ease-out' : 'none'
            }}
            onTouchStart={(e) => {
              const touch = e.touches[0]
              const startY = touch.clientY
              const startOffset = sheetDragOffset

              const handleTouchMove = (moveEvent: TouchEvent) => {
                const currentTouch = moveEvent.touches[0]
                const deltaY = currentTouch.clientY - startY
                // Only allow dragging down
                if (deltaY > 0) {
                  setSheetDragOffset(deltaY)
                }
              }

              const handleTouchEnd = (endEvent: TouchEvent) => {
                // If dragged more than 100px, close the sheet
                if (sheetDragOffset > 100) {
                  setMobileSheetType(null)
                }
                setSheetDragOffset(0)
                document.removeEventListener('touchmove', handleTouchMove)
                document.removeEventListener('touchend', handleTouchEnd)
              }

              document.addEventListener('touchmove', handleTouchMove)
              document.addEventListener('touchend', handleTouchEnd)
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center py-3 border-b-2 border-amber-500 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1 bg-amber-500" />
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 3rem)' }}>
              {mobileSheetType === 'filters' && (
                <div className="p-6 space-y-6 font-mono">
                  {/* Search & Tags */}
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
                        value={mobileFilterSearchInput}
                        onChange={(e) => setMobileFilterSearchInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && mobileFilterSearchInput.trim()) {
                            handleAddTag(mobileFilterSearchInput.trim())
                          }
                        }}
                        placeholder="TYPE TO SEARCH..."
                        className="w-full bg-black border-2 border-amber-500 px-4 py-2.5 text-sm placeholder:text-amber-500/50 focus:outline-none focus:border-amber-400 transition-colors text-amber-500 tracking-wide"
                      />

                      {mobileFilterSearchInput && filteredSuggestions.length > 0 && (
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

                  {/* Time Range */}
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
                            onClick={() => setTimeRange(range.hours)}
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

                  {/* Category */}
                  <div>
                    <label className="text-xs text-amber-500/70 uppercase tracking-wider mb-2 block">&gt; CATEGORY</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSelectedCategory("")}
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
                          onClick={() => setSelectedCategory(key)}
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

                  {/* Min Priority */}
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
                          onClick={() => setMinPriority(value)}
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

                  {/* Clear All Filters */}
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => {
                        setSelectedCategory("")
                        setMinPriority(100)
                        setTimeRange(999)
                        setSearchTags([])
                      }}
                      className="w-full py-2.5 bg-red-600/20 border-2 border-red-600 text-sm font-bold hover:bg-red-600/30 transition-colors text-amber-500 tracking-wider"
                    >
                      [X] CLEAR ALL FILTERS
                    </button>
                  )}
                </div>
              )}

              {mobileSheetType === 'incidents' && (
                <div className="p-6 space-y-3 font-mono">
                  <div className="flex items-center justify-between border-b-2 border-amber-500 pb-3 mb-4">
                    <div className="text-xs text-amber-500/70 uppercase tracking-wider">╔ ALL INCIDENTS ({filteredItems.length}) ╗</div>
                    <button
                      onClick={() => setMobileSheetType(null)}
                      className="w-8 h-8 border-2 border-amber-500 hover:bg-amber-500 hover:text-black text-amber-500 transition-all font-bold"
                    >
                      X
                    </button>
                  </div>

                  {filteredItems.map((item) => {
                    const locationInfo = (() => {
                      const hasLocation = !!(item.lat && item.lon)
                      if (!item.address_raw) return { label: "NO LOCATION", hasLocation: false }
                      const address = item.address_raw.trim()
                      if (/^\d+/.test(address) && /\*\*\*/.test(address)) return { label: "BLOCK LEVEL", hasLocation }
                      if (/^\d+/.test(address)) return { label: "BLOCK LEVEL", hasLocation }
                      if (/\b(AND|&|\/)\b/i.test(address)) return { label: "INTERSECTION", hasLocation }
                      return { label: "AREA ONLY", hasLocation }
                    })()

                    return (
                      <button
                        key={item.incident_id}
                        onClick={() => {
                          setSelectedIncident(item)
                          setMobileSheetType(null)
                          setShowBottomSheet(true)
                        }}
                        className="w-full text-left bg-black border-2 border-amber-500 p-4 hover:bg-amber-500/10 transition-all group"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div
                              className="inline-block px-3 py-1 border-2 text-xs font-bold tracking-wider uppercase"
                              style={{
                                borderColor: getPriorityColor(item.priority),
                                color: getPriorityColor(item.priority),
                                boxShadow: `0 0 4px ${getPriorityColor(item.priority)}40`
                              }}
                            >
                              [P-{item.priority} {getPriorityLabel(item.priority)}]
                            </div>
                            {item.call_category && (
                              <div className="inline-block px-3 py-1 border-2 border-amber-500/50 text-xs font-bold tracking-wider uppercase text-amber-500/70">
                                [{item.call_category}]
                              </div>
                            )}
                            <div className={`inline-flex items-center gap-1 px-3 py-1 border-2 text-xs font-bold tracking-wider uppercase ${
                              locationInfo.hasLocation ? 'border-green-500/50 text-green-500/70' : 'border-red-500/50 text-red-500/70'
                            }`}>
                              [{locationInfo.hasLocation ? <MapPin className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />} {locationInfo.label}]
                            </div>
                          </div>
                          <div>
                            <h3 className="font-bold text-lg mb-1 group-hover:text-amber-400 transition-colors text-amber-500">
                              &gt; {item.call_type}
                            </h3>
                            <p className="text-sm text-amber-500/70 truncate">LOCATION: {item.address_raw || "UNKNOWN"}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}

                  {filteredItems.length === 0 && (
                    <div className="text-center py-12 text-amber-500/70 tracking-wider">
                      &gt; NO INCIDENTS FOUND
                    </div>
                  )}
                </div>
              )}

              {mobileSheetType === 'critical' && (
                <div className="p-6 space-y-3 font-mono">
                  <div className="flex items-center justify-between border-b-2 border-red-600 pb-3 mb-4">
                    <div className="text-xs text-red-600/70 uppercase tracking-wider">╔ CRITICAL INCIDENTS ({criticalIncidents.length}) ╗</div>
                    <button
                      onClick={() => setMobileSheetType(null)}
                      className="w-8 h-8 border-2 border-amber-500 hover:bg-amber-500 hover:text-black text-amber-500 transition-all font-bold"
                    >
                      X
                    </button>
                  </div>

                  {criticalIncidents.map((item) => {
                    const locationInfo = (() => {
                      const hasLocation = !!(item.lat && item.lon)
                      if (!item.address_raw) return { label: "NO LOCATION", hasLocation: false }
                      const address = item.address_raw.trim()
                      if (/^\d+/.test(address) && /\*\*\*/.test(address)) return { label: "BLOCK LEVEL", hasLocation }
                      if (/^\d+/.test(address)) return { label: "BLOCK LEVEL", hasLocation }
                      if (/\b(AND|&|\/)\b/i.test(address)) return { label: "INTERSECTION", hasLocation }
                      return { label: "AREA ONLY", hasLocation }
                    })()

                    return (
                      <button
                        key={item.incident_id}
                        onClick={() => {
                          setSelectedIncident(item)
                          setMobileSheetType(null)
                          setShowBottomSheet(true)
                        }}
                        className="w-full text-left bg-black border-2 border-red-600 p-4 hover:bg-red-600/10 transition-all group"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div
                              className="inline-block px-3 py-1 border-2 text-xs font-bold tracking-wider uppercase"
                              style={{
                                borderColor: getPriorityColor(item.priority),
                                color: getPriorityColor(item.priority),
                                boxShadow: `0 0 4px ${getPriorityColor(item.priority)}40`
                              }}
                            >
                              [P-{item.priority} {getPriorityLabel(item.priority)}]
                            </div>
                            {item.call_category && (
                              <div className="inline-block px-3 py-1 border-2 border-amber-500/50 text-xs font-bold tracking-wider uppercase text-amber-500/70">
                                [{item.call_category}]
                              </div>
                            )}
                            <div className={`inline-flex items-center gap-1 px-3 py-1 border-2 text-xs font-bold tracking-wider uppercase ${
                              locationInfo.hasLocation ? 'border-green-500/50 text-green-500/70' : 'border-red-500/50 text-red-500/70'
                            }`}>
                              [{locationInfo.hasLocation ? <MapPin className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />} {locationInfo.label}]
                            </div>
                          </div>
                          <div>
                            <h3 className="font-bold text-lg mb-1 group-hover:text-amber-400 transition-colors text-red-600">
                              &gt; {item.call_type}
                            </h3>
                            <p className="text-sm text-amber-500/70 truncate">LOCATION: {item.address_raw || "UNKNOWN"}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}

                  {criticalIncidents.length === 0 && (
                    <div className="text-center py-12 text-amber-500/70 tracking-wider">
                      &gt; NO CRITICAL INCIDENTS
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* List view for browsing incidents - Desktop only */}
      {showListView && (
        <div className="hidden md:block">
          <IncidentListView
            items={filteredItems}
            onClose={() => setShowListView(false)}
            onSelectIncident={(incident) => {
              setSelectedIncident(incident)
            }}
            getPriorityLabel={getPriorityLabel}
            getPriorityColor={getPriorityColor}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
        </div>
      )}

      {/* Footer credit */}
      <div
        className="absolute left-0 right-0 z-20 flex justify-center pointer-events-none"
        style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <a
          href="https://circlecreativegroup.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-amber-500/60 hover:text-amber-500 transition-colors pointer-events-auto border-2 border-amber-500/40 px-4 py-2 font-mono tracking-wider"
        >
          [BUILT BY CIRCLE CREATIVE GROUP]
        </a>
      </div>
    </div>
  )
}
