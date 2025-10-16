"use client"

import { MapPin, Search, Zap } from "lucide-react"
import { useEffect, useRef } from "react"

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
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
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
  }, [])

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0a0e14]">
      {/* Background map - non-interactive, centered on Riverside */}
      <div
        ref={mapRef}
        className="absolute inset-0 z-0"
        style={{
          transform: "scale(1.1)",
        }}
      />

      {/* Dark overlay for better text contrast */}
      <div className="absolute inset-0 bg-black/70 z-[1]" />

      {/* Subtle gradient lighting effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-orange-500/10 z-[2]" />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="mt-39 mb-8 inline-flex items-center gap-2 bg-red-500/20 backdrop-blur-2xl border border-red-500/30 rounded-full px-6 py-3 shadow-lg">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse-slow" />
          <span className="text-sm font-bold tracking-wider">LIVE INCIDENTS</span>
        </div>

        {/* Hero heading */}
        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 max-w-4xl">
          Stay informed about incidents in{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
            Riverside County
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl leading-relaxed">
          Real-time updates from the Riverside Sheriff's Office. Track incidents, filter by category, and stay aware of
          what's happening in your community.
        </p>

        {/* Call-to-action button */}
        <button
          onClick={onEnter}
          className="group relative bg-white/95 text-black font-bold text-lg px-12 py-5 rounded-full hover:bg-white transition-all shadow-2xl hover:shadow-red-500/20 hover:scale-105"
          style={{
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
          }}
        >
          <span className="relative z-10">View Live Incidents</span>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 to-orange-500 opacity-0 group-hover:opacity-10 transition-opacity" />
        </button>

        {/* Feature cards - Increased bottom margin from mb-34 to mb-49 (196px) */}
        <div className="mt-16 mb-49 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-lg">
            <div className="flex justify-center mb-6">
              <MapPin className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="font-bold text-lg mb-2">Interactive Map</h3>
            <p className="text-sm text-gray-400">
              View incidents on a live map with color-coded markers based on priority
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-lg">
            <div className="flex justify-center mb-6">
              <Search className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="font-bold text-lg mb-2">Smart Filters</h3>
            <p className="text-sm text-gray-400">Filter by category, priority, time range, and search with tags</p>
          </div>

          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-lg">
            <div className="flex justify-center mb-6">
              <Zap className="w-8 h-8 text-yellow-500" />
            </div>
            <h3 className="font-bold text-lg mb-2">Real-Time Updates</h3>
            <p className="text-sm text-gray-400">
              Get instant updates as new incidents are reported by the Sheriff's Office
            </p>
          </div>
        </div>

        {/* Data source attribution */}
        <p className="mt-12 text-sm text-gray-500">
          Data sourced from Riverside Sheriff's Office public incident reports
        </p>
      </div>

      {/* Footer credit */}
      <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <a
          href="https://circlecreativegroup.com"
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto text-xs text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10"
        >
          Built with ♥ by Circle Creative Group
        </a>
      </div>
    </div>
  )
}
