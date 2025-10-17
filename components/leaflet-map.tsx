"use client"

import { useEffect, useRef, useState } from "react"
import type { IncidentsResponse } from "@/lib/api/incidents"

type Incident = IncidentsResponse["items"][number]

type LeafletMapProps = {
  items: Incident[]
  onMarkerClick: (item: Incident) => void
  selectedIncident: Incident | null
  onLocationPermission?: (granted: boolean) => void
  isRefreshing?: boolean
  sidePanelOpen?: boolean
  panelWidth?: number
  showBottomSheet?: boolean
  initialCenter?: [number, number]
  initialZoom?: number
  onMapMove?: (center: [number, number], zoom: number) => void
}

/**
 * Category color mapping - matches CATEGORY_COLORS from page.tsx
 */
const CATEGORY_COLORS: Record<string, string> = {
  violent: "#ef4444",
  weapons: "#f97316",
  property: "#f59e0b",
  traffic: "#84cc16",
  disturbance: "#eab308",
  drug: "#a855f7",
}

/**
 * Get color for incident based on category (not priority)
 */
const getCategoryColor = (category: string | null | undefined): string => {
  if (!category) return "#ffb000" // Default amber
  return CATEGORY_COLORS[category.toLowerCase()] || "#ffb000"
}

const getApproximateLevel = (item: Incident): "exact" | "small" | "medium" | "large" => {
  if (!item.address_raw) return "large"

  const hasStreetNumber = /^\d+/.test(item.address_raw.trim())
  if (!hasStreetNumber) return "medium"

  // Check for redaction/approximation indicators like "***" or "XX"
  if (/\*\*\*|XXX|XX/.test(item.address_raw)) return "medium"

  // Check for generic/approximate terms including standalone "BLOCK"
  const genericTerms = ["AREA", "VICINITY", "NEAR", "BLOCK OF", "BLOCK", "BLK"]
  const isGeneric = genericTerms.some((term) => item.address_raw?.toUpperCase().includes(term))

  if (isGeneric) return "medium"

  // Check for intersection (two street names with &, AND, or /)
  if (/\b(AND|&|\/)\b/i.test(item.address_raw)) return "small"

  return "exact"
}

export default function LeafletMap({ items, onMarkerClick, selectedIncident, onLocationPermission, isRefreshing, sidePanelOpen, panelWidth = 320, showBottomSheet, initialCenter, initialZoom, onMapMove }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [useMapbox, setUseMapbox] = useState(true)
  const tileLayerRef = useRef<any>(null)
  const hasInitialZoomedRef = useRef(false)
  const savedViewRef = useRef<{ center: [number, number]; zoom: number } | null>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return

    const loadLeaflet = async () => {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link")
        link.id = "leaflet-css"
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)
      }

      if (!(window as any).L) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script")
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          script.onload = resolve
          script.onerror = reject
          document.head.appendChild(script)
        })
      }

      const L = (window as any).L

      if (!mapInstanceRef.current && mapRef.current) {
        const riversideCenter: [number, number] = [33.8303, -117.3762]
        const defaultZoom = 10

        const map = L.map(mapRef.current, {
          center: initialCenter || riversideCenter,
          zoom: initialZoom || defaultZoom,
          zoomControl: false,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          touchZoom: true,
          dragging: true,
        })

        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

        if (mapboxToken && useMapbox) {
          tileLayerRef.current = L.tileLayer(
            `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`,
            {
              attribution: '© <a href="https://www.mapbox.com/">Mapbox</a>',
              tileSize: 512,
              zoomOffset: -1,
              maxZoom: 19,
              updateWhenZooming: false, // Prevent tile loading during zoom animation
              keepBuffer: 4, // Keep more tiles loaded for smoother panning
            },
          ).addTo(map)
        } else {
          tileLayerRef.current = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 20,
            updateWhenZooming: false, // Prevent tile loading during zoom animation
            keepBuffer: 4, // Keep more tiles loaded for smoother panning
          }).addTo(map)
        }

        L.control.zoom({ position: "bottomright" }).addTo(map)

        const style = document.createElement("style")
        style.textContent = `
          .leaflet-bottom.leaflet-right {
            bottom: 24px !important;
            right: 24px !important;
          }
          .leaflet-control-zoom {
            border: 2px solid #ffb000 !important;
            border-radius: 0 !important;
            overflow: hidden;
            box-shadow: 0 0 8px rgba(255, 176, 0, 0.3) !important;
          }
          .leaflet-control-zoom a {
            background: #000000 !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            color: #ffb000 !important;
            border: none !important;
            border-bottom: 2px solid #ffb000 !important;
            width: 40px !important;
            height: 40px !important;
            line-height: 40px !important;
            font-size: 20px !important;
            font-weight: bold !important;
            font-family: "IBM Plex Mono", "Courier New", monospace !important;
          }
          .leaflet-control-zoom a:last-child {
            border-bottom: none !important;
          }
          .leaflet-control-zoom a:hover {
            background: #ffb000 !important;
            color: #000000 !important;
          }
        `
        document.head.appendChild(style)

        mapInstanceRef.current = map

        // Add event listeners for map position changes
        if (onMapMove) {
          map.on('moveend', () => {
            const center = map.getCenter()
            const zoom = map.getZoom()
            onMapMove([center.lat, center.lng], zoom)
          })
        }

        // Wait for map to be fully loaded before requesting location
        map.whenReady(() => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                console.log('[MAP] Location permission granted')
                onLocationPermission?.(true)

                const userLat = position.coords.latitude
                const userLon = position.coords.longitude

                const isInRiversideArea = userLat >= 33.4 && userLat <= 34.2 && userLon >= -117.8 && userLon <= -116.8

                if (isInRiversideArea && mapInstanceRef.current) {
                  try {
                    mapInstanceRef.current.setView([userLat, userLon], 13)

                    const userIcon = L.divIcon({
                      className: "user-location-marker",
                      html: `
                        <div style="position: relative; width: 40px; height: 40px;">
                          <!-- Outer pulsing glow ring -->
                          <div style="
                            position: absolute;
                            inset: 0;
                            background: #22d3ee;
                            opacity: 0.2;
                            animation: pulse-gps 2s ease-in-out infinite;
                          "></div>

                          <!-- Crosshair horizontal line -->
                          <div style="
                            position: absolute;
                            top: 50%;
                            left: 4px;
                            right: 4px;
                            height: 2px;
                            background: #22d3ee;
                            transform: translateY(-50%);
                            box-shadow: 0 0 6px #22d3ee;
                          "></div>

                          <!-- Crosshair vertical line -->
                          <div style="
                            position: absolute;
                            left: 50%;
                            top: 4px;
                            bottom: 4px;
                            width: 2px;
                            background: #22d3ee;
                            transform: translateX(-50%);
                            box-shadow: 0 0 6px #22d3ee;
                          "></div>

                          <!-- Corner brackets (top-left) -->
                          <div style="
                            position: absolute;
                            top: 6px;
                            left: 6px;
                            width: 8px;
                            height: 8px;
                            border-top: 2px solid #22d3ee;
                            border-left: 2px solid #22d3ee;
                            box-shadow: 0 0 4px #22d3ee;
                          "></div>

                          <!-- Corner brackets (top-right) -->
                          <div style="
                            position: absolute;
                            top: 6px;
                            right: 6px;
                            width: 8px;
                            height: 8px;
                            border-top: 2px solid #22d3ee;
                            border-right: 2px solid #22d3ee;
                            box-shadow: 0 0 4px #22d3ee;
                          "></div>

                          <!-- Corner brackets (bottom-left) -->
                          <div style="
                            position: absolute;
                            bottom: 6px;
                            left: 6px;
                            width: 8px;
                            height: 8px;
                            border-bottom: 2px solid #22d3ee;
                            border-left: 2px solid #22d3ee;
                            box-shadow: 0 0 4px #22d3ee;
                          "></div>

                          <!-- Corner brackets (bottom-right) -->
                          <div style="
                            position: absolute;
                            bottom: 6px;
                            right: 6px;
                            width: 8px;
                            height: 8px;
                            border-bottom: 2px solid #22d3ee;
                            border-right: 2px solid #22d3ee;
                            box-shadow: 0 0 4px #22d3ee;
                          "></div>

                          <!-- Center pulsing dot -->
                          <div style="
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            width: 6px;
                            height: 6px;
                            background: #22d3ee;
                            border-radius: 50%;
                            animation: pulse-center 1.5s ease-in-out infinite;
                            box-shadow: 0 0 8px #22d3ee;
                          "></div>
                        </div>
                      `,
                      iconSize: [40, 40],
                      iconAnchor: [20, 20],
                    })

                    L.marker([userLat, userLon], { icon: userIcon }).addTo(mapInstanceRef.current).bindPopup("Your Location")
                  } catch (e) {
                    console.error('[MAP] Error setting user location:', e)
                  }
                }
              },
              (error) => {
                console.log('[MAP] Location permission denied:', error.message)
                onLocationPermission?.(false)
              },
              { timeout: 5000, maximumAge: 60000 },
            )
          }
        })
      }
    }

    loadLeaflet().catch(console.error)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [useMapbox])

  useEffect(() => {
    if (!mapInstanceRef.current || typeof window === "undefined") return

    const L = (window as any).L
    if (!L) return

    // Safely remove markers
    markersRef.current.forEach((marker) => {
      try {
        if (marker && mapInstanceRef.current) {
          marker.remove()
        }
      } catch (e) {
        // Ignore errors from already-removed markers
      }
    })
    markersRef.current = []

    const validItems = items.filter((item) => item.lat && item.lon)

    validItems.forEach((item) => {
      const color = getCategoryColor(item.call_category)
      const approxLevel = getApproximateLevel(item)

      let icon

      if (approxLevel === "exact") {
        // Exact location: sharp square terminal-style pin
        icon = L.divIcon({
          className: "custom-marker",
          html: `
            <div style="position: relative; width: 32px; height: 32px;">
              <div style="
                position: absolute;
                inset: 0;
                background: ${color};
                opacity: 0.2;
                animation: pulse-exact 2s ease-in-out infinite;
              "></div>
              <div style="
                position: absolute;
                inset: 6px;
                border: 3px solid ${color};
                background: black;
                box-shadow: 0 0 8px ${color}, inset 0 0 8px ${color}40;
              "></div>
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 8px;
                height: 8px;
                background: ${color};
                box-shadow: 0 0 6px ${color};
              "></div>
              <div style="
                position: absolute;
                top: -2px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 4px solid transparent;
                border-right: 4px solid transparent;
                border-bottom: 6px solid ${color};
              "></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })
      } else {
        // Approximate location with varying sizes based on uncertainty
        const sizes = {
          small: { outer: 56, middle: 12, inner: 20, opacity: 0.12 },
          medium: { outer: 72, middle: 16, inner: 24, opacity: 0.15 },
          large: { outer: 96, middle: 20, inner: 28, opacity: 0.18 },
        }

        const size = sizes[approxLevel]

        icon = L.divIcon({
          className: "custom-marker",
          html: `
            <div style="position: relative; width: ${size.outer}px; height: ${size.outer}px;">
              <!-- Radar ring 1 - outermost expanding -->
              <div style="
                position: absolute;
                inset: 0;
                border: 2px solid ${color};
                border-radius: 50%;
                opacity: 0;
                animation: radar-ping 3s ease-out infinite;
              "></div>

              <!-- Radar ring 2 - middle expanding -->
              <div style="
                position: absolute;
                inset: 0;
                border: 2px solid ${color};
                border-radius: 50%;
                opacity: 0;
                animation: radar-ping 3s ease-out infinite 1s;
              "></div>

              <!-- Radar ring 3 - inner expanding -->
              <div style="
                position: absolute;
                inset: 0;
                border: 2px solid ${color};
                border-radius: 50%;
                opacity: 0;
                animation: radar-ping 3s ease-out infinite 2s;
              "></div>

              <!-- Large uncertainty radius -->
              <div style="
                position: absolute;
                inset: 0;
                background: ${color};
                border-radius: 50%;
                opacity: ${size.opacity};
                animation: pulse-approximate 2s ease-in-out infinite;
              "></div>

              <!-- Rotating dashed border -->
              <div style="
                position: absolute;
                inset: ${size.middle}px;
                border: 3px dashed ${color};
                border-radius: 50%;
                opacity: 0.5;
                animation: rotate-dashed 8s linear infinite;
              "></div>

              <!-- Inner solid ring -->
              <div style="
                position: absolute;
                inset: ${size.inner}px;
                border: 2px solid ${color};
                border-radius: 50%;
                background: black;
                opacity: 0.8;
                box-shadow: 0 0 8px ${color}80;
              "></div>

              <!-- Center dot -->
              <div style="
                position: absolute;
                inset: ${size.inner + 8}px;
                background: ${color};
                border-radius: 50%;
                box-shadow: 0 0 12px ${color}, 0 0 24px ${color}40;
              "></div>

              <!-- Inner white dot -->
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 4px;
                height: 4px;
                background: white;
                border-radius: 50%;
              "></div>
            </div>
          `,
          iconSize: [size.outer, size.outer],
          iconAnchor: [size.outer / 2, size.outer / 2],
        })
      }

      const marker = L.marker([item.lat!, item.lon!], { icon })
        .addTo(mapInstanceRef.current)
        .on("click", () => onMarkerClick(item))

      markersRef.current.push(marker)
    })

    // Only zoom to fit all pins on the very first load (never again after that)
    // Skip if user provided initial center/zoom from URL params
    if (validItems.length > 0 && !hasInitialZoomedRef.current && !selectedIncident && !initialCenter && !initialZoom) {
      // Add a small delay to ensure markers are rendered first
      setTimeout(() => {
        if (mapInstanceRef.current) {
          const bounds = L.latLngBounds(validItems.map((item) => [item.lat!, item.lon!]))
          mapInstanceRef.current.fitBounds(bounds, {
            padding: [80, 80],
            maxZoom: 13,
            animate: true,
            duration: 0.8
          })
          hasInitialZoomedRef.current = true
          console.log('[MAP] Initial auto-zoom completed')
        }
      }, 100)
    }
  }, [items, onMarkerClick, selectedIncident])

  // Reusable function to calculate safe area center and animate to a pin
  const flyToIncidentInSafeArea = (lat: number, lon: number, zoom: number) => {
    if (!mapInstanceRef.current) return

    const L = (window as any).L

    // Calculate pixel offset to center pin in safe area
    let offsetX = 0
    let offsetY = 0

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Desktop: offset for side panel
    if (sidePanelOpen && viewportWidth >= 768) {
      // Panel is on the right, shift view right to center pin in left 2/3rds
      // Safe area is (viewportWidth - panelWidth), center is at half of that
      // Offset from viewport center = (safe area center) - (viewport center)
      offsetX = -(panelWidth / 2)
    }

    // Mobile: offset for bottom sheet
    if (showBottomSheet && viewportWidth < 768) {
      // Bottom sheet is ~45vh from bottom
      // Visible area is ~55vh, we want pin centered in that area (~27.5vh from top)
      // Viewport center is at 50vh, so shift up by (50vh - 27.5vh) = 22.5vh
      offsetY = viewportHeight * 0.225
    }

    // Get the container point for the pin's actual position at target zoom
    const targetPoint = mapInstanceRef.current.project([lat, lon], zoom)

    // Add offset to position pin in safe area
    const offsetPoint = L.point(targetPoint.x - offsetX, targetPoint.y - offsetY)

    // Convert back to lat/lng - this is where the map center should be
    const targetCenter = mapInstanceRef.current.unproject(offsetPoint, zoom)

    // Fly to the calculated center point with smooth animation
    mapInstanceRef.current.flyTo(targetCenter, zoom, {
      duration: 1.5,
      easeLinearity: 0.25,
    })

    console.log('[MAP] Flying to incident in safe area:', {
      incident: [lat, lon],
      offset: { offsetX, offsetY },
      targetCenter: [targetCenter.lat, targetCenter.lng],
      sidePanelOpen,
      showBottomSheet,
    })
  }

  useEffect(() => {
    if (!mapInstanceRef.current || typeof window === "undefined") return

    const L = (window as any).L
    if (!L) return

    // When selecting an incident, save current view and animate to it
    if (selectedIncident && selectedIncident.lat && selectedIncident.lon) {
      // Save current view before zooming
      if (!savedViewRef.current) {
        const center = mapInstanceRef.current.getCenter()
        const zoom = mapInstanceRef.current.getZoom()
        savedViewRef.current = { center: [center.lat, center.lng], zoom }
        console.log('[MAP] Saved user view:', savedViewRef.current)
      }

      // Fly directly to incident centered in safe area
      flyToIncidentInSafeArea(selectedIncident.lat, selectedIncident.lon, 18)
    }
    // When deselecting, restore previous view
    else if (!selectedIncident && savedViewRef.current) {
      console.log('[MAP] Restoring user view:', savedViewRef.current)
      mapInstanceRef.current.flyTo(savedViewRef.current.center, savedViewRef.current.zoom, {
        duration: 1.2,
        easeLinearity: 0.25,
      })
      savedViewRef.current = null
    }
  }, [selectedIncident, sidePanelOpen, panelWidth, showBottomSheet])

  return (
    <>
      <div ref={mapRef} className="absolute inset-0 w-full h-full bg-[#1a1a1a]">
        <style jsx global>{`
          @keyframes pulse-exact {
            0%, 100% {
              transform: scale(1);
              opacity: 0.2;
            }
            50% {
              transform: scale(1.3);
              opacity: 0.4;
            }
          }

          @keyframes pulse-approximate {
            0%, 100% {
              transform: scale(1);
              opacity: 0.15;
            }
            50% {
              transform: scale(1.5);
              opacity: 0.25;
            }
          }

          @keyframes rotate-dashed {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes pulse-gps {
            0%, 100% {
              transform: scale(1);
              opacity: 0.2;
            }
            50% {
              transform: scale(1.8);
              opacity: 0.4;
            }
          }

          @keyframes pulse-center {
            0%, 100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.4);
              opacity: 0.6;
            }
          }

          @keyframes radar-ping {
            0% {
              transform: scale(0.5);
              opacity: 0.6;
            }
            50% {
              opacity: 0.3;
            }
            100% {
              transform: scale(1.8);
              opacity: 0;
            }
          }
        `}</style>
      </div>

      {/* Mapbox toggle hidden - use URL params or theme to control */}
    </>
  )
}
