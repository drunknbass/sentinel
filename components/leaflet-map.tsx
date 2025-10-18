"use client"

import { useEffect, useRef, useState } from "react"
import type { IncidentsResponse } from "@/lib/api/incidents"

type Incident = IncidentsResponse["items"][number]

type LeafletMapProps = {
  items: Incident[]
  onMarkerClick: (item: Incident) => void
  selectedIncident: Incident | null
  onLocationPermission?: (granted: boolean) => void
  onUserLocation?: (lat: number, lon: number) => void
  disableInteractions?: boolean
  locationEnabled?: boolean
  isRefreshing?: boolean
  sidePanelOpen?: boolean
  panelWidth?: number
  showBottomSheet?: boolean
  pinVerticalPosition?: number  // 0-1: Where pin should appear vertically (0=top, 0.5=center, 1=bottom)
  initialCenter?: [number, number]
  initialZoom?: number
  onMapMove?: (center: [number, number], zoom: number) => void
  requestLocationTrigger?: number  // Change this number to trigger a new location request
  onLocationRequestReady?: (requestFn: () => void) => void  // Callback to expose location request function
}

/**
 * Get color for incident based on priority (1-100, lower = more urgent)
 */
const getPriorityColor = (priority: number): string => {
  if (priority <= 20) return "#ef4444"  // Red - Critical
  if (priority <= 40) return "#f97316"  // Orange - High
  if (priority <= 60) return "#eab308"  // Yellow - Medium
  if (priority <= 80) return "#84cc16"  // Lime - Low
  return "#06b6d4"                       // Cyan - Very Low / Routine
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

export default function LeafletMap({ items, onMarkerClick, selectedIncident, onLocationPermission, onUserLocation, disableInteractions = false, locationEnabled = true, isRefreshing, sidePanelOpen, panelWidth = 320, showBottomSheet, pinVerticalPosition = 0.5, initialCenter, initialZoom, onMapMove, requestLocationTrigger, onLocationRequestReady }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const markerClusterGroupRef = useRef<any>(null)
  const [useMapbox, setUseMapbox] = useState(true)
  const tileLayerRef = useRef<any>(null)
  const hasInitialZoomedRef = useRef(false)
  const savedViewRef = useRef<{ center: [number, number]; zoom: number } | null>(null)
  const userMarkerRef = useRef<any>(null)
  const userMarkerZoomHandlerRef = useRef<any>(null)

  // Reusable function to request user location
  const requestUserLocation = () => {
    if (typeof window === "undefined") {
      console.log('[MAP] Window is undefined, cannot request location')
      return
    }

    if (!navigator.geolocation) {
      console.error('[MAP] Geolocation is not supported by this browser')
      onLocationPermission?.(false)
      return
    }

    if (!mapInstanceRef.current) {
      console.log('[MAP] Map not ready yet, will retry when map loads')
      return
    }

    const L = (window as any).L
    if (!L) {
      console.log('[MAP] Leaflet not loaded yet')
      return
    }

    console.log('[MAP] Requesting user location...', {
      protocol: window.location.protocol,
      isSecure: window.location.protocol === 'https:',
      userAgent: navigator.userAgent
    })

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('[MAP] Location permission granted')
        onLocationPermission?.(true)

        const userLat = position.coords.latitude
        const userLon = position.coords.longitude

        // Bubble location up so API requests can use hardware location context
        try {
          onUserLocation?.(userLat, userLon)
        } catch {}

        if (mapInstanceRef.current) {
          try {
            // Remove existing user marker if any
            if (userMarkerRef.current) {
              userMarkerRef.current.remove()
            }

            // Clean up zoom event handler if it exists
            if (userMarkerZoomHandlerRef.current && mapInstanceRef.current) {
              mapInstanceRef.current.off('zoomend', userMarkerZoomHandlerRef.current)
              userMarkerZoomHandlerRef.current = null
            }

            // Always show user marker and center view on current location
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

            userMarkerRef.current = L.marker([userLat, userLon], { icon: userIcon, zIndexOffset: 10000 }).addTo(mapInstanceRef.current)

            // Force immediate and aggressive map redraw to ensure marker appears
            // Multiple techniques to guarantee rendering
            try {
              // Immediate invalidate
              mapInstanceRef.current.invalidateSize({ pan: false })

              // Force tiny pan to trigger redraw
              mapInstanceRef.current.panBy([0, 0])

              // Deferred invalidate as backup
              requestAnimationFrame(() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.invalidateSize({ pan: false })
                  mapInstanceRef.current.panBy([1, 0])
                  mapInstanceRef.current.panBy([-1, 0])
                }
              })
            } catch (e) {
              console.error('[MAP] Error forcing redraw:', e)
            }

            // Update pulse scale based on zoom level
            const updatePulseScale = () => {
              if (!userMarkerRef.current) return
              const zoom = mapInstanceRef.current.getZoom()
              // Scale from 1.2 at zoom 5 to 2.5 at zoom 18
              const minZoom = 5, maxZoom = 18
              const minScale = 1.2, maxScale = 2.5
              const scale = minScale + ((zoom - minZoom) / (maxZoom - minZoom)) * (maxScale - minScale)
              const clampedScale = Math.max(minScale, Math.min(maxScale, scale))

              const markerElement = userMarkerRef.current.getElement()
              if (markerElement) {
                markerElement.style.setProperty('--pulse-scale', clampedScale.toString())
              }
            }

            // Set initial pulse scale after DOM is ready
            requestAnimationFrame(() => updatePulseScale())

            // Store handler ref for cleanup
            userMarkerZoomHandlerRef.current = updatePulseScale

            // Update on zoom
            mapInstanceRef.current.on('zoomend', updatePulseScale)
          } catch (e) {
            console.error('[MAP] Error setting user location:', e)
          }
        }
      },
      (error) => {
        console.error('[MAP] Location error:', {
          code: error.code,
          message: error.message,
          PERMISSION_DENIED: error.code === 1,
          POSITION_UNAVAILABLE: error.code === 2,
          TIMEOUT: error.code === 3,
        })

        // Provide specific error messages
        if (error.code === 1) {
          console.log('[MAP] Location permission denied by user or blocked by browser')
          console.log('[MAP] On iOS: Check Settings > Safari > Location Services')
        } else if (error.code === 2) {
          console.log('[MAP] Position unavailable - GPS may be disabled')
        } else if (error.code === 3) {
          console.log('[MAP] Location request timed out')
        }

        onLocationPermission?.(false)
      },
      {
        timeout: 10000,
        maximumAge: 0,
        enableHighAccuracy: true
      },
    )
  }

  // Watch for manual location request trigger
  useEffect(() => {
    if (requestLocationTrigger && requestLocationTrigger > 0) {
      console.log('[MAP] Manual location request triggered:', requestLocationTrigger)
      requestUserLocation()
    }
  }, [requestLocationTrigger])

  // Respect external UI locks (e.g., mobile panels) by disabling map dragging/interaction
  useEffect(() => {
    if (!mapInstanceRef.current) return
    try {
      if (disableInteractions) {
        mapInstanceRef.current.dragging?.disable()
        mapInstanceRef.current.boxZoom?.disable()
        mapInstanceRef.current.keyboard?.disable()
      } else {
        mapInstanceRef.current.dragging?.enable()
        mapInstanceRef.current.boxZoom?.enable()
        mapInstanceRef.current.keyboard?.enable()
      }
    } catch {}
  }, [disableInteractions])

  // Remove user marker when GPS is disabled
  useEffect(() => {
    if (!locationEnabled && userMarkerRef.current) {
      try {
        userMarkerRef.current.remove()
        userMarkerRef.current = null

        // Clean up zoom event handler
        if (userMarkerZoomHandlerRef.current && mapInstanceRef.current) {
          mapInstanceRef.current.off('zoomend', userMarkerZoomHandlerRef.current)
          userMarkerZoomHandlerRef.current = null
        }
      } catch {}
    }
  }, [locationEnabled])

  // Expose location request function to parent (for user-initiated requests on iOS)
  useEffect(() => {
    if (onLocationRequestReady && mapInstanceRef.current) {
      console.log('[MAP] Exposing location request function to parent')
      onLocationRequestReady(requestUserLocation)
    }
  }, [onLocationRequestReady])

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

      if (!document.getElementById("leaflet-markercluster-css")) {
        const link = document.createElement("link")
        link.id = "leaflet-markercluster-css"
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"
        document.head.appendChild(link)
      }

      if (!document.getElementById("leaflet-markercluster-default-css")) {
        const link = document.createElement("link")
        link.id = "leaflet-markercluster-default-css"
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"
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

      if (!(window as any).L?.markerClusterGroup) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script")
          script.src = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"
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
          scrollWheelZoom: false,
          doubleClickZoom: true,
          touchZoom: true,
          dragging: true,
          preferCanvas: true,
          inertia: false,
          fadeAnimation: true,
          zoomAnimation: true,
          zoomAnimationThreshold: 4,
          markerZoomAnimation: true,
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
              updateWhenIdle: true,
              updateWhenZooming: false,
              keepBuffer: 8,
            },
          ).addTo(map)
        } else {
          tileLayerRef.current = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 20,
            updateWhenIdle: true,
            updateWhenZooming: false,
            keepBuffer: 8,
          }).addTo(map)
        }

        // Add zoom controls (works with programmatic zoom even if touch/wheel zoom are disabled)
        L.control.zoom({ position: "bottomright" }).addTo(map)

        const style = document.createElement("style")
        style.textContent = `
          .leaflet-bottom.leaflet-right {
            bottom: 24px !important;
            right: 38px !important;
          }

          /* Mobile: nudge zoom buttons to the right */
          @media (max-width: 767px) {
            .leaflet-bottom.leaflet-right {
              right: 8px !important;
            }
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

        // Create marker cluster group with stable positioning
        markerClusterGroupRef.current = L.markerClusterGroup({
          maxClusterRadius: 80,
          disableClusteringAtZoom: 18,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true,
          // Stability options to prevent drift during pan
          removeOutsideVisibleBounds: false, // Keep clusters stable during panning
          animateAddingMarkers: false, // Reduce visual shifting
          chunkedLoading: true, // Better performance and stability
          chunkInterval: 50, // Process markers in chunks
          chunkDelay: 50, // Delay between chunks
          iconCreateFunction: function(cluster: any) {
            const count = cluster.getChildCount()
            let sizeClass = 'small'
            if (count > 50) sizeClass = 'large'
            else if (count > 10) sizeClass = 'medium'

            return L.divIcon({
              html: `<div class="cluster-inner"><span>${count}</span></div>`,
              className: `marker-cluster marker-cluster-${sizeClass}`,
              iconSize: L.point(40, 40)
            })
          }
        })
        map.addLayer(markerClusterGroupRef.current)

        // Expose location request immediately once map exists (ensures user-gesture path works)
        try { onLocationRequestReady?.(requestUserLocation) } catch {}

        // Add event listeners for map position changes
        if (onMapMove) {
          map.on('moveend', () => {
            const center = map.getCenter()
            const zoom = map.getZoom()
            onMapMove([center.lat, center.lng], zoom)
          })
        }

        // Do not auto-request location. Request only on explicit user action (via GPS button)
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

    // Clear cluster group
    if (markerClusterGroupRef.current) {
      markerClusterGroupRef.current.clearLayers()
    }
    markersRef.current = []

    const validItems = items.filter((item) => item.lat && item.lon)

    validItems.forEach((item) => {
      const color = getPriorityColor(item.priority)

      // Different visual styles based on priority level
      let size, pulseSpeed, glowIntensity, borderWidth

      if (item.priority <= 20) {
        // Critical: Large, fast pulse, intense glow
        size = 40
        pulseSpeed = '0.8s'
        glowIntensity = '12px'
        borderWidth = 4
      } else if (item.priority <= 40) {
        // High: Medium-large, medium pulse
        size = 36
        pulseSpeed = '1.2s'
        glowIntensity = '10px'
        borderWidth = 3
      } else if (item.priority <= 60) {
        // Medium: Standard size
        size = 32
        pulseSpeed = '1.8s'
        glowIntensity = '8px'
        borderWidth = 3
      } else if (item.priority <= 80) {
        // Low: Small, slow pulse
        size = 28
        pulseSpeed = '2.5s'
        glowIntensity = '6px'
        borderWidth = 2
      } else {
        // Routine: Smallest, minimal animation
        size = 24
        pulseSpeed = '3s'
        glowIntensity = '4px'
        borderWidth = 2
      }

      const icon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="position: relative; width: ${size}px; height: ${size}px;">
            <div style="
              position: absolute;
              inset: 0;
              background: ${color};
              opacity: 0.2;
              animation: pulse-priority ${pulseSpeed} ease-in-out infinite;
            "></div>
            <div style="
              position: absolute;
              inset: ${size * 0.15}px;
              border: ${borderWidth}px solid ${color};
              background: black;
              box-shadow: 0 0 ${glowIntensity} ${color}, inset 0 0 ${glowIntensity} ${color}40;
            "></div>
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: ${size * 0.25}px;
              height: ${size * 0.25}px;
              background: ${color};
              box-shadow: 0 0 ${glowIntensity} ${color};
            "></div>
            <div style="
              position: absolute;
              top: -2px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: ${size * 0.125}px solid transparent;
              border-right: ${size * 0.125}px solid transparent;
              border-bottom: ${size * 0.1875}px solid ${color};
            "></div>
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })

      const marker = L.marker([item.lat!, item.lon!], { icon })
        .on("click", () => onMarkerClick(item))

      if (markerClusterGroupRef.current) {
        markerClusterGroupRef.current.addLayer(marker)
      }
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

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Calculate pixel offset to position pin at desired vertical position
    // pinVerticalPosition: 0 = top, 0.5 = center, 1 = bottom
    // To make pin appear ABOVE center, we shift map center DOWN (add to Y)
    // To make pin appear BELOW center, we shift map center UP (subtract from Y)
    const offsetY = (pinVerticalPosition - 0.5) * viewportHeight

    // Desktop: offset for side panel (centers pin horizontally in safe area)
    let offsetX = 0
    if (sidePanelOpen && viewportWidth >= 768) {
      // Panel is on the right, shift view right to center pin in left portion
      // Safe area is (viewportWidth - panelWidth), center is at half of that
      // Offset from viewport center = (safe area center) - (viewport center)
      offsetX = -(panelWidth / 2)
    }

    // Get the container point for the pin's actual position at target zoom
    const targetPoint = mapInstanceRef.current.project([lat, lon], zoom)

    // Apply offset to position pin in safe area
    const offsetPoint = L.point(targetPoint.x - offsetX, targetPoint.y - offsetY)

    // Convert back to lat/lng - this is where the map center should be
    const targetCenter = mapInstanceRef.current.unproject(offsetPoint, zoom)

    // Fly to the calculated center point with smooth animation
    mapInstanceRef.current.flyTo(targetCenter, zoom, {
      duration: 0.9,
      easeLinearity: 0.3,
      animate: true
    })

    console.log('[MAP] Flying to incident:', {
      incident: [lat, lon],
      pinVerticalPosition,
      offset: { offsetX, offsetY },
      targetCenter: [targetCenter.lat, targetCenter.lng],
    })
  }

  useEffect(() => {
    if (!mapInstanceRef.current || typeof window === "undefined") return

    const L = (window as any).L
    if (!L) return

    // When selecting an incident, save current view (once) and animate to it
    if (selectedIncident && selectedIncident.lat && selectedIncident.lon) {
      // Save current view only on first incident selection
      if (!savedViewRef.current) {
        const center = mapInstanceRef.current.getCenter()
        const zoom = mapInstanceRef.current.getZoom()
        savedViewRef.current = { center: [center.lat, center.lng], zoom }
        console.log('[MAP] Saved user view:', savedViewRef.current)
      }

      // Always fly to the selected incident (works for first pin and switching between pins)
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
  }, [selectedIncident, sidePanelOpen, panelWidth, showBottomSheet, pinVerticalPosition])

  return (
    <>
      <div ref={mapRef} className="absolute inset-0 w-full h-full bg-[#1a1a1a]">
        <style jsx global>{`
          @keyframes pulse-priority {
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
              transform: scale(var(--pulse-scale, 1.5));
              opacity: 0.4;
            }
          }

          /* Ensure user location marker appears above clusters */
          .user-location-marker {
            z-index: 10000 !important;
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

          /* Cluster styles - targeting reticle / bomb target theme */
          .marker-cluster {
            background-color: transparent !important;
            border: none !important;
            border-radius: 0 !important;
          }

          .marker-cluster div {
            background-color: rgba(0, 0, 0, 0.9) !important;
            border: 2px solid #ffb000 !important;
            border-radius: 0 !important;
            color: #ffb000 !important;
            font-family: 'IBM Plex Mono', 'Courier New', monospace !important;
            font-weight: bold !important;
            box-shadow:
              0 0 16px rgba(255, 176, 0, 0.8),
              inset 0 0 12px rgba(255, 176, 0, 0.3),
              0 0 0 4px rgba(0, 0, 0, 0.9),
              0 0 0 6px rgba(255, 176, 0, 0.6) !important;
            position: relative !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            letter-spacing: 0.5px !important;
            animation: target-pulse 2s ease-in-out infinite !important;
          }

          /* Corner targeting brackets */
          .marker-cluster {
            position: relative !important;
          }

          .marker-cluster::before {
            content: '' !important;
            position: absolute !important;
            top: -8px !important;
            left: -8px !important;
            width: 12px !important;
            height: 12px !important;
            border-top: 2px solid #ffb000 !important;
            border-left: 2px solid #ffb000 !important;
            opacity: 0.8 !important;
          }

          .marker-cluster::after {
            content: '' !important;
            position: absolute !important;
            top: -8px !important;
            right: -8px !important;
            width: 12px !important;
            height: 12px !important;
            border-top: 2px solid #ffb000 !important;
            border-right: 2px solid #ffb000 !important;
            opacity: 0.8 !important;
          }

          .marker-cluster-small div {
            width: 36px !important;
            height: 36px !important;
            margin-left: 2px !important;
            margin-top: 2px !important;
            font-size: 11px !important;
            line-height: 1 !important;
          }

          .marker-cluster-small::before {
            bottom: -8px !important;
            top: auto !important;
            border-bottom: 2px solid #ffb000 !important;
            border-top: none !important;
          }

          .marker-cluster-small::after {
            bottom: -8px !important;
            top: auto !important;
            left: -8px !important;
            right: auto !important;
            border-bottom: 2px solid #ffb000 !important;
            border-left: 2px solid #ffb000 !important;
            border-top: none !important;
            border-right: none !important;
          }

          .marker-cluster-medium div {
            width: 44px !important;
            height: 44px !important;
            margin-left: -2px !important;
            margin-top: -2px !important;
            font-size: 13px !important;
            line-height: 1 !important;
          }

          .marker-cluster-medium::before {
            bottom: -8px !important;
            top: auto !important;
            border-bottom: 2px solid #ffb000 !important;
            border-top: none !important;
          }

          .marker-cluster-medium::after {
            bottom: -8px !important;
            top: auto !important;
            left: -8px !important;
            right: auto !important;
            border-bottom: 2px solid #ffb000 !important;
            border-left: 2px solid #ffb000 !important;
            border-top: none !important;
            border-right: none !important;
          }

          .marker-cluster-large div {
            width: 52px !important;
            height: 52px !important;
            margin-left: -6px !important;
            margin-top: -6px !important;
            font-size: 15px !important;
            line-height: 1 !important;
          }

          .marker-cluster-large::before {
            bottom: -8px !important;
            top: auto !important;
            border-bottom: 2px solid #ffb000 !important;
            border-top: none !important;
          }

          .marker-cluster-large::after {
            bottom: -8px !important;
            top: auto !important;
            left: -8px !important;
            right: auto !important;
            border-bottom: 2px solid #ffb000 !important;
            border-left: 2px solid #ffb000 !important;
            border-top: none !important;
            border-right: none !important;
          }

          @keyframes target-pulse {
            0%, 100% {
              box-shadow:
                0 0 16px rgba(255, 176, 0, 0.8),
                inset 0 0 12px rgba(255, 176, 0, 0.3),
                0 0 0 4px rgba(0, 0, 0, 0.9),
                0 0 0 6px rgba(255, 176, 0, 0.6);
            }
            50% {
              box-shadow:
                0 0 24px rgba(255, 176, 0, 1),
                inset 0 0 16px rgba(255, 176, 0, 0.4),
                0 0 0 4px rgba(0, 0, 0, 0.9),
                0 0 0 6px rgba(255, 176, 0, 0.9);
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
