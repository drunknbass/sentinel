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
}

const getPriorityColor = (priority: number) => {
  if (priority <= 20) return "#ef4444"
  if (priority <= 40) return "#f97316"
  if (priority <= 60) return "#eab308"
  return "#6b7280"
}

export default function LeafletMap({ items, onMarkerClick, selectedIncident, onLocationPermission, isRefreshing }: LeafletMapProps) {
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
          center: riversideCenter,
          zoom: defaultZoom,
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
            },
          ).addTo(map)
        } else {
          tileLayerRef.current = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 20,
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
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 12px !important;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
          }
          .leaflet-control-zoom a {
            background: rgba(0, 0, 0, 0.8) !important;
            backdrop-filter: blur(24px) !important;
            -webkit-backdrop-filter: blur(24px) !important;
            color: white !important;
            border: none !important;
            width: 40px !important;
            height: 40px !important;
            line-height: 40px !important;
            font-size: 20px !important;
            font-weight: bold !important;
          }
          .leaflet-control-zoom a:hover {
            background: rgba(255, 255, 255, 0.1) !important;
          }
        `
        document.head.appendChild(style)

        mapInstanceRef.current = map

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
                        <div style="position: relative; width: 20px; height: 20px;">
                          <div style="
                            position: absolute;
                            inset: 0;
                            background: #3b82f6;
                            border-radius: 50%;
                            filter: blur(6px);
                            opacity: 0.6;
                          "></div>
                          <div style="
                            position: absolute;
                            inset: 4px;
                            background: #3b82f6;
                            border: 3px solid white;
                            border-radius: 50%;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                          "></div>
                        </div>
                      `,
                      iconSize: [20, 20],
                      iconAnchor: [10, 10],
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
      const color = getPriorityColor(item.priority)
      const isApproximate = item.location_approximate === true

      // Different marker styles for exact vs approximate locations
      const icon = L.divIcon({
        className: "custom-marker",
        html: isApproximate ? `
          <div style="position: relative; width: 32px; height: 32px;">
            <!-- Larger dashed circle for approximate location area -->
            <div style="
              position: absolute;
              inset: 0;
              border: 2px dashed ${color};
              border-radius: 50%;
              opacity: 0.5;
              animation: pulse-approximate 2s ease-in-out infinite;
            "></div>
            <!-- Inner solid dot -->
            <div style="
              position: absolute;
              inset: 10px;
              background: ${color};
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            "></div>
            <!-- Opacity overlay to show it's approximate -->
            <div style="
              position: absolute;
              inset: 10px;
              background: black;
              border-radius: 50%;
              opacity: 0.3;
            "></div>
          </div>
        ` : `
          <div style="position: relative; width: 24px; height: 24px;">
            <div style="
              position: absolute;
              inset: 0;
              background: ${color};
              border-radius: 50%;
              filter: blur(8px);
              opacity: 0.6;
              animation: pulse 2s ease-in-out infinite;
            "></div>
            <div style="
              position: absolute;
              inset: 6px;
              background: ${color};
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            "></div>
          </div>
        `,
        iconSize: isApproximate ? [32, 32] : [24, 24],
        iconAnchor: isApproximate ? [16, 16] : [12, 12],
      })

      const marker = L.marker([item.lat!, item.lon!], { icon })
        .addTo(mapInstanceRef.current)
        .on("click", () => onMarkerClick(item))

      markersRef.current.push(marker)
    })

    // Only zoom to fit all pins on the very first load (never again after that)
    if (validItems.length > 0 && !hasInitialZoomedRef.current && !selectedIncident) {
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

  useEffect(() => {
    if (!mapInstanceRef.current || typeof window === "undefined") return

    const L = (window as any).L
    if (!L) return

    // When selecting an incident, save current view and zoom in
    if (selectedIncident && selectedIncident.lat && selectedIncident.lon) {
      // Save current view before zooming
      if (!savedViewRef.current) {
        const center = mapInstanceRef.current.getCenter()
        const zoom = mapInstanceRef.current.getZoom()
        savedViewRef.current = { center: [center.lat, center.lng], zoom }
        console.log('[MAP] Saved user view:', savedViewRef.current)
      }

      // Zoom in close to the selected incident
      mapInstanceRef.current.flyTo([selectedIncident.lat, selectedIncident.lon], 17, {
        duration: 0.5,
      })
      console.log('[MAP] Zoomed to incident:', selectedIncident.incident_id)
    }
    // When deselecting, restore previous view
    else if (!selectedIncident && savedViewRef.current) {
      console.log('[MAP] Restoring user view:', savedViewRef.current)
      mapInstanceRef.current.flyTo(savedViewRef.current.center, savedViewRef.current.zoom, {
        duration: 0.5,
      })
      savedViewRef.current = null
    }
  }, [selectedIncident])

  return (
    <>
      <div ref={mapRef} className="absolute inset-0 w-full h-full">
        <style jsx global>{`
          @keyframes pulse {
            0%,
            100% {
              transform: scale(1);
              opacity: 0.6;
            }
            50% {
              transform: scale(1.2);
              opacity: 0.8;
            }
          }
          @keyframes pulse-approximate {
            0%,
            100% {
              transform: scale(1);
              opacity: 0.4;
            }
            50% {
              transform: scale(1.15);
              opacity: 0.6;
            }
          }
        `}</style>
      </div>

      {process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
        <button
          onClick={() => setUseMapbox(!useMapbox)}
          className="absolute bottom-20 right-6 z-50 bg-black/60 backdrop-blur-2xl border border-white/20 rounded-full px-4 py-2 text-xs font-bold tracking-wide hover:bg-black/80 transition-all shadow-lg"
          style={{
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
          }}
        >
          {useMapbox ? "Mapbox" : "CartoDB"}
        </button>
      )}
    </>
  )
}
