"use client"

import { useEffect, useRef, useState } from "react"

type Item = {
  incident_id: string
  call_type: string
  call_category: string
  priority: number
  received_at: string
  address_raw: string | null
  area: string | null
  disposition: string | null
  lat: number | null
  lon: number | null
}

type LeafletMapProps = {
  items: Item[]
  onMarkerClick: (item: Item) => void
  selectedIncident: Item | null
}

const getPriorityColor = (priority: number) => {
  if (priority <= 20) return "#ef4444"
  if (priority <= 40) return "#f97316"
  if (priority <= 60) return "#eab308"
  return "#6b7280"
}

export default function LeafletMap({ items, onMarkerClick, selectedIncident }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [userLocationUsed, setUserLocationUsed] = useState(false)
  const [useMapbox, setUseMapbox] = useState(true)
  const tileLayerRef = useRef<any>(null)

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

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const userLat = position.coords.latitude
              const userLon = position.coords.longitude

              const isInRiversideArea = userLat >= 33.4 && userLat <= 34.2 && userLon >= -117.8 && userLon <= -116.8

              if (isInRiversideArea) {
                map.setView([userLat, userLon], 13)

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

                L.marker([userLat, userLon], { icon: userIcon }).addTo(map).bindPopup("Your Location")

                setUserLocationUsed(true)
              }
            },
            (error) => {
              console.log("[v0] Geolocation error:", error.message)
            },
            { timeout: 5000, maximumAge: 60000 },
          )
        }
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

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    const validItems = items.filter((item) => item.lat && item.lon)

    validItems.forEach((item) => {
      const color = getPriorityColor(item.priority)

      const icon = L.divIcon({
        className: "custom-marker",
        html: `
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
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })

      const marker = L.marker([item.lat!, item.lon!], { icon })
        .addTo(mapInstanceRef.current)
        .on("click", () => onMarkerClick(item))

      markersRef.current.push(marker)
    })

    if (validItems.length > 0 && !userLocationUsed) {
      const bounds = L.latLngBounds(validItems.map((item) => [item.lat!, item.lon!]))
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 })
    }
  }, [items, onMarkerClick, userLocationUsed])

  useEffect(() => {
    if (!mapInstanceRef.current || !selectedIncident || typeof window === "undefined") return

    const L = (window as any).L
    if (!L || !selectedIncident.lat || !selectedIncident.lon) return

    mapInstanceRef.current.flyTo([selectedIncident.lat, selectedIncident.lon], 15, {
      duration: 0.5,
    })
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
