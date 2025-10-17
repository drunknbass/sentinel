"use client"
import { useEffect, useRef, useState } from "react"

/**
 * LandingPage Component
 *
 * Marketing/splash page that introduces users to the Riverside Incidents app.
 * Features:
 * - Non-interactive map background centered on Riverside, CA
 * - Hero section with call-to-action
 * - Three feature cards explaining app capabilities
 * - Requests location permission when user enters the app
 *
 * @param onEnter - Callback function triggered when user clicks "View Live Incidents"
 */
export default function LandingPage({ onEnter }: { onEnter: () => void }) {
  const mapRef = useRef<HTMLDivElement>(null)
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
    if (typeof window === "undefined" || !mapRef.current) return

    const loadLeaflet = async () => {
      // Load Leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link")
        link.id = "leaflet-css"
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)
      }

      // Load Leaflet JS
      if (!(window as any).L) {
        await new Promise((resolve) => {
          const script = document.createElement("script")
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          script.onload = resolve
          document.head.appendChild(script)
        })
      }

      const L = (window as any).L
      if (!L || !mapRef.current) return

      // Initialize map centered on Riverside, CA with all interactions disabled
      const map = L.map(mapRef.current, {
        center: [33.9533, -117.3962], // Riverside city center coordinates
        zoom: 12,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false,
        attributionControl: false,
      })

      // Add dark tile layer from Mapbox or fallback to CartoDB
      if (mapboxToken) {
        L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`, {
          tileSize: 512,
          zoomOffset: -1,
        }).addTo(map)
      } else {
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          subdomains: "abcd",
          maxZoom: 20,
        }).addTo(map)
      }
    }

    loadLeaflet()
  }, [mapboxToken])

  return (
    <div className="relative h-screen w-full overflow-y-auto overflow-x-hidden bg-black">
      {/* Background map */}
      <div
        ref={mapRef}
        className="fixed inset-0 z-0"
        style={{
          transform: "scale(1.1)",
        }}
      />

      <div className="fixed inset-0 bg-black/70 z-[1]" />

      <div className="sticky top-0 left-0 right-0 z-10 bg-black border-b-2 border-amber-500 p-4">
        <div className="text-center font-mono text-amber-500 text-[10px] md:text-xs leading-tight">
          <div className="hidden md:block">
            ╔═══════════════════════════════════════════════════════════════════════════════╗
          </div>
          <div className="md:hidden">╔═══════════════════════════════════╗</div>
          <div className="hidden md:block">║ RIVERSIDE SHERIFF OFFICE - MOBILE DATA TERMINAL ║</div>
          <div className="md:hidden">║ RSO - MDT SYSTEM ║</div>
          <div className="hidden md:block">║ INCIDENT TRACKING SYSTEM ║</div>
          <div className="md:hidden">║ INCIDENT TRACKER ║</div>
          <div className="hidden md:block">
            ╚═══════════════════════════════════════════════════════════════════════════════╝
          </div>
          <div className="md:hidden">╚═══════════════════════════════════╝</div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-start min-h-screen px-4 md:px-6 py-12 text-center font-mono">
        <div className="mb-8 bg-black border-2 border-amber-500 px-4 md:px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-500 animate-blink font-bold">█</span>
            <span className="text-xs md:text-sm font-bold text-amber-500 tracking-wider">SYSTEM ONLINE</span>
          </div>
        </div>

        <div className="mb-8 text-amber-500 text-[10px] md:text-xs leading-relaxed max-w-3xl w-full">
          <div className="mb-2 hidden md:block">
            ╔════════════════════════════════════════════════════════════════════════╗
          </div>
          <div className="mb-2 md:hidden">╔═══════════════════════════════════╗</div>
          <div className="px-2 md:px-4 py-2 space-y-1">
            <div>&gt; REAL-TIME MONITORING</div>
            <div className="hidden md:block">&gt; GEOGRAPHIC INFORMATION SYSTEM</div>
            <div className="md:hidden">&gt; GIS MAPPING</div>
            <div className="hidden md:block">&gt; PRIORITY-BASED ALERT CLASSIFICATION</div>
            <div className="md:hidden">&gt; PRIORITY ALERTS</div>
            <div className="hidden md:block">&gt; MULTI-CATEGORY FILTERING CAPABILITIES</div>
            <div className="md:hidden">&gt; CATEGORY FILTERS</div>
          </div>
          <div className="mt-2 hidden md:block">
            ╚════════════════════════════════════════════════════════════════════════╝
          </div>
          <div className="mt-2 md:hidden">╚═══════════════════════════════════╝</div>
        </div>

        <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold mb-6 text-amber-500 tracking-wider">
          RSO INCIDENT TRACKER
        </h1>

        <p className="text-sm md:text-base lg:text-lg text-amber-400 mb-12 max-w-2xl leading-relaxed tracking-wide px-4">
          AUTHORIZED ACCESS TO RIVERSIDE COUNTY SHERIFF DEPARTMENT
          <br />
          REAL-TIME INCIDENT DATA FEED
        </p>

        <button
          onClick={onEnter}
          className="bg-amber-500 text-black font-bold text-base md:text-lg px-8 md:px-12 py-3 md:py-4 hover:bg-amber-400 transition-all border-4 border-amber-600 tracking-widest"
        >
          [ENTER] ACCESS SYSTEM
        </button>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full text-left mb-12">
          <div className="bg-black border-2 border-amber-500 p-4">
            <div className="text-amber-500 mb-2 font-bold tracking-wider">[1] MAP VIEW</div>
            <p className="text-xs text-amber-400 leading-relaxed">
              INTERACTIVE GEOGRAPHIC DISPLAY WITH REAL-TIME INCIDENT MARKERS
            </p>
          </div>

          <div className="bg-black border-2 border-amber-500 p-4">
            <div className="text-amber-500 mb-2 font-bold tracking-wider">[2] FILTERS</div>
            <p className="text-xs text-amber-400 leading-relaxed">
              ADVANCED SEARCH BY CATEGORY, PRIORITY, TIME RANGE, AND TAGS
            </p>
          </div>

          <div className="bg-black border-2 border-amber-500 p-4">
            <div className="text-amber-500 mb-2 font-bold tracking-wider">[3] ALERTS</div>
            <p className="text-xs text-amber-400 leading-relaxed">
              INSTANT CRITICAL INCIDENT NOTIFICATIONS AS REPORTED
            </p>
          </div>
        </div>

        <div className="text-xs text-amber-500/50 tracking-wider mb-8">
          DATA SOURCE: RIVERSIDE SHERIFF OFFICE PUBLIC RECORDS
        </div>

        <div className="relative z-10 flex justify-center mb-8">
          <a
            href="https://circlecreativegroup.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-amber-500/60 hover:text-amber-500 transition-colors px-4 py-2 border-2 border-amber-500/40 font-mono tracking-wider"
          >
            [BUILT BY CIRCLE CREATIVE GROUP]
          </a>
        </div>
      </div>
    </div>
  )
}
