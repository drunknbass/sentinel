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
  mapStyle: "crt" | "normal"
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    violent: "#8b0000",
    weapons: "#ff0000",
    property: "#ff4500",
    traffic: "#ff8c00",
    disturbance: "#ffa500",
    drug: "#ffb000",
    medical: "#d4af37",
    other: "#9b870c",
    admin: "#6b7280",
  }
  return colors[category.toLowerCase()] || "#ffb000"
}

const getApproximateLevel = (item: Item): "exact" | "small" | "medium" | "large" => {
  if (!item.address_raw) return "large"

  const hasStreetNumber = /^\d+/.test(item.address_raw.trim())
  if (!hasStreetNumber) return "medium"

  const genericTerms = ["AREA", "VICINITY", "NEAR", "BLOCK OF", "BLK"]
  const isGeneric = genericTerms.some((term) => item.address_raw?.toUpperCase().includes(term))

  if (isGeneric) return "medium"

  // Check for intersection (two street names with &, AND, or /)
  if (/\b(AND|&|\/)\b/i.test(item.address_raw)) return "small"

  return "exact"
}

export default function LeafletMap({ items, onMarkerClick, selectedIncident, mapStyle }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [userLocationUsed, setUserLocationUsed] = useState(false)
  const tileLayerRef = useRef<any>(null)
  const [useMapbox, setUseMapbox] = useState(mapStyle === "crt")
  const [mapboxToken, setMapboxToken] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/mapbox-token")
      .then((res) => res.json())
      .then((data) => {
        if (data.token) {
          setMapboxToken(data.token)
        }
      })
      .catch((err) => console.error("Failed to fetch Mapbox token:", err))
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return

    const L = (window as any).L
    if (!L) return

    if (!mapboxToken) return

    tileLayerRef.current.remove()

    const existingStyle = document.getElementById("map-amber-filter")
    if (existingStyle) {
      existingStyle.remove()
    }

    if (mapStyle === "crt") {
      tileLayerRef.current = L.tileLayer(
        `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`,
        {
          attribution: '© <a href="https://www.mapbox.com/">Mapbox</a>',
          tileSize: 512,
          zoomOffset: -1,
          maxZoom: 19,
        },
      ).addTo(mapInstanceRef.current)

      const style = document.createElement("style")
      style.id = "map-amber-filter"
      style.textContent = `
        .leaflet-tile-container {
          filter: sepia(0.3) saturate(1.2) hue-rotate(-10deg) brightness(0.9);
        }
      `
      document.head.appendChild(style)
    } else {
      tileLayerRef.current = L.tileLayer(
        `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`,
        {
          attribution: '© <a href="https://www.mapbox.com/">Mapbox</a>',
          tileSize: 512,
          zoomOffset: -1,
          maxZoom: 19,
        },
      ).addTo(mapInstanceRef.current)
    }
  }, [mapStyle, mapboxToken])

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

        if (mapboxToken) {
          tileLayerRef.current = L.tileLayer(
            `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`,
            {
              attribution: '© <a href="https://www.mapbox.com/">Mapbox</a>',
              tileSize: 512,
              zoomOffset: -1,
              maxZoom: 19,
            },
          ).addTo(map)

          const style = document.createElement("style")
          style.id = "map-amber-filter"
          style.textContent = `
            .leaflet-tile-container {
              filter: sepia(0.3) saturate(1.2) hue-rotate(-10deg) brightness(0.9);
            }
          `
          document.head.appendChild(style)
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
            border: 2px solid #ffb000 !important;
            border-radius: 0 !important;
            overflow: hidden;
            box-shadow: 0 0 10px rgba(255, 176, 0, 0.3) !important;
          }
          .leaflet-control-zoom a {
            background: #000000 !important;
            color: #ffb000 !important;
            border: none !important;
            width: 40px !important;
            height: 40px !important;
            line-height: 40px !important;
            font-size: 20px !important;
            font-weight: bold !important;
            font-family: 'IBM Plex Mono', monospace !important;
          }
          .leaflet-control-zoom a:hover {
            background: #ffb000 !important;
            color: #000000 !important;
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
                    <div style="position: relative; width: 40px; height: 40px;">
                      <!-- Outer pulsing glow ring -->
                      <div style="
                        position: absolute;
                        inset: 0;
                        background: #ffb000;
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
                        background: #ffb000;
                        transform: translateY(-50%);
                        box-shadow: 0 0 6px #ffb000;
                      "></div>
                      
                      <!-- Crosshair vertical line -->
                      <div style="
                        position: absolute;
                        left: 50%;
                        top: 4px;
                        bottom: 4px;
                        width: 2px;
                        background: #ffb000;
                        transform: translateX(-50%);
                        box-shadow: 0 0 6px #ffb000;
                      "></div>
                      
                      <!-- Corner brackets (top-left) -->
                      <div style="
                        position: absolute;
                        top: 6px;
                        left: 6px;
                        width: 8px;
                        height: 8px;
                        border-top: 2px solid #ffb000;
                        border-left: 2px solid #ffb000;
                        box-shadow: 0 0 4px #ffb000;
                      "></div>
                      
                      <!-- Corner brackets (top-right) -->
                      <div style="
                        position: absolute;
                        top: 6px;
                        right: 6px;
                        width: 8px;
                        height: 8px;
                        border-top: 2px solid #ffb000;
                        border-right: 2px solid #ffb000;
                        box-shadow: 0 0 4px #ffb000;
                      "></div>
                      
                      <!-- Corner brackets (bottom-left) -->
                      <div style="
                        position: absolute;
                        bottom: 6px;
                        left: 6px;
                        width: 8px;
                        height: 8px;
                        border-bottom: 2px solid #ffb000;
                        border-left: 2px solid #ffb000;
                        box-shadow: 0 0 4px #ffb000;
                      "></div>
                      
                      <!-- Corner brackets (bottom-right) -->
                      <div style="
                        position: absolute;
                        bottom: 6px;
                        right: 6px;
                        width: 8px;
                        height: 8px;
                        border-bottom: 2px solid #ffb000;
                        border-right: 2px solid #ffb000;
                        box-shadow: 0 0 4px #ffb000;
                      "></div>
                      
                      <!-- Center dot with strong glow -->
                      <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 8px;
                        height: 8px;
                        background: #ffb000;
                        box-shadow: 0 0 8px #ffb000, 0 0 16px #ffb000, 0 0 24px #ffb00080;
                        animation: pulse-center 1.5s ease-in-out infinite;
                      "></div>
                    </div>
                  `,
                  iconSize: [40, 40],
                  iconAnchor: [20, 20],
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
  }, [mapboxToken])

  useEffect(() => {
    if (!mapInstanceRef.current || typeof window === "undefined") return

    const L = (window as any).L
    if (!L) return

    markersRef.current.forEach((marker) => marker.remove())
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
          
          /* Added GPS location marker animations */
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
              transform: translate(-50%, -50%) scale(1.3);
              opacity: 0.8;
            }
          }
        `}</style>
      </div>
    </>
  )
}
