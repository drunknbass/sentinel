"use client"

import React, { useEffect, useRef, useState } from "react"

type AlignMode = "none" | "bounds" | "mean"

// Default demo points (roughly around Perris, CA)
// Four pins in a vertical column (same lon) for clear visual checks
const DEFAULT_POINTS: Array<[number, number]> = [
  [33.8000, -117.2300],
  [33.8200, -117.2300],
  [33.8400, -117.2300],
  [33.8600, -117.2300],
]

const parsePointsFromQuery = (): Array<[number, number]> => {
  try {
    const sp = new URLSearchParams(window.location.search)
    const raw = sp.get("points")
    if (!raw) return DEFAULT_POINTS
    const pts = raw.split(";")
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => {
        const [a, b] = p.split(",").map(Number)
        return [a, b] as [number, number]
      })
      .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b))
    return pts.length ? pts : DEFAULT_POINTS
  } catch {
    return DEFAULT_POINTS
  }
}

export default function ClusterTestPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mcgRef = useRef<any>(null)
  const [align, setAlignState] = useState<AlignMode>(() => {
    if (typeof window === "undefined") return "mean"
    const sp = new URLSearchParams(window.location.search)
    const v = (sp.get("align") || "mean").toLowerCase() as AlignMode
    return (v === "none" || v === "bounds" || v === "mean") ? v : "mean"
  })
  const setAlign = (v: AlignMode) => {
    setAlignState(v)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set("align", v)
      window.history.replaceState(null, "", url.toString())
    } catch {}
  }
  const pointsRef = useRef<Array<[number, number]>>([])
  const debugLayerRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current) return

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

      const map = L.map(mapRef.current!, {
        center: [33.83, -117.23],
        zoom: 11,
        zoomControl: true,
      })
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 20,
        attribution: '© OpenStreetMap, © CARTO'
      }).addTo(map)

      // Match app zoom control styling/position
      const style = document.createElement("style")
      style.textContent = `
        .leaflet-bottom.leaflet-right { bottom: 24px !important; right: 38px !important; }
        @media (max-width: 767px) { .leaflet-bottom.leaflet-right { right: 8px !important; } }
        .leaflet-control-zoom { border: 2px solid #ffb000 !important; border-radius: 0 !important; overflow: hidden; box-shadow: 0 0 8px rgba(255,176,0,0.3) !important; }
        .leaflet-control-zoom a { background:#000 !important; color:#ffb000 !important; border:none !important; border-bottom:2px solid #ffb000 !important; width:40px !important; height:40px !important; line-height:40px !important; font-size:20px !important; font-weight:bold !important; font-family:"IBM Plex Mono","Courier New",monospace !important; }
        .leaflet-control-zoom a:last-child { border-bottom:none !important; }
        .leaflet-control-zoom a:hover { background:#ffb000 !important; color:#000 !important; }
      `
      document.head.appendChild(style)
      L.control.zoom({ position: "bottomright" }).addTo(map)

      // Banded clustering identical to app
      const CLUSTER_BANDS = [
        { start: 6, end: 9, basePx: 40 },
        { start: 10, end: 12, basePx: 28 },
        { start: 13, end: 14, basePx: 22 },
        { start: 15, end: 16, basePx: 18 },
      ] as const
      const maxClusterRadius = (z: number) => {
        const zoom = Math.floor(z)
        const band = CLUSTER_BANDS.find(b => zoom >= b.start && zoom <= b.end)
        if (!band) return 32
        const steps = zoom - band.start
        const radius = band.basePx * Math.pow(2, steps)
        return Math.max(12, Math.min(200, Math.round(radius)))
      }

      const mcg = L.markerClusterGroup({
        maxClusterRadius,
        disableClusteringAtZoom: 18,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        removeOutsideVisibleBounds: false,
        animateAddingMarkers: false,
        chunkedLoading: true,
        iconCreateFunction(cluster: any) {
          const count = cluster.getChildCount()
          let size = 36
          let cls = "small"
          if (count > 50) { size = 52; cls = "large" }
          else if (count > 10) { size = 44; cls = "medium" }
          const modeColor = align === "mean" ? "#00ff88" : align === "bounds" ? "#00bfff" : "#888888"
          return L.divIcon({
            html: `<div class="cluster-inner" style="border:2px solid ${modeColor}"><span>${count}</span></div>`,
            className: `marker-cluster marker-cluster-${cls}`,
            iconSize: L.point(size, size),
            iconAnchor: L.point(size/2, size/2),
          })
        }
      })
      mcgRef.current = mcg
      mcg.addTo(map)

      pointsRef.current = parsePointsFromQuery()
      pointsRef.current.forEach(([lat, lon], i) => {
        const m = L.marker([lat, lon])
        ;(m as any)._debugId = `pt${i}`
        mcg.addLayer(m)
      })

      if (!debugLayerRef.current) debugLayerRef.current = L.layerGroup().addTo(map)

      const drawDebugForClusters = () => {
        const layerGroup = debugLayerRef.current
        layerGroup.clearLayers()
        const zoom = map.getZoom()
        mcg.eachLayer((layer: any) => {
          if (typeof layer.getChildCount !== "function" || layer.getChildCount() <= 1) return
          const childMarkers: any[] = layer.getAllChildMarkers?.() ?? []
          if (childMarkers.length < 2) return

          const pluginLL = layer.getLatLng()
          const boundsCenter = layer.getBounds().getCenter()
          let meanLat = 0, meanLng = 0
          childMarkers.forEach((m: any) => { const ll = m.getLatLng(); meanLat += ll.lat; meanLng += ll.lng })
          const meanLL = L.latLng(meanLat/childMarkers.length, meanLng/childMarkers.length)

          const px = (ll: any) => map.latLngToContainerPoint(ll)
          const dPx = (a: any, b: any) => {
            const pa = px(a), pb = px(b)
            return Math.hypot(pa.x - pb.x, pa.y - pb.y).toFixed(1)
          }
          const dMeters = (a: any, b: any) => a.distanceTo(b).toFixed(1)

          console.log(`z=${zoom} cluster(${childMarkers.length})`, {
            pluginLL: pluginLL, boundsCenter: boundsCenter, meanLL: meanLL,
            d_px_plugin_vs_mean: dPx(pluginLL, meanLL), d_m_plugin_vs_mean: dMeters(pluginLL, meanLL),
            d_px_bounds_vs_mean: dPx(boundsCenter, meanLL), d_m_bounds_vs_mean: dMeters(boundsCenter, meanLL),
          })

          // draw points
          L.circleMarker(pluginLL, { radius: 5, color: "#ffb000" }).addTo(layerGroup).bindTooltip("plugin")
          L.circleMarker(boundsCenter, { radius: 5, color: "#00bfff" }).addTo(layerGroup).bindTooltip("bounds")
          L.circleMarker(meanLL, { radius: 5, color: "#00ff88" }).addTo(layerGroup).bindTooltip("mean")
        })
      }

      const alignClusters = () => {
        if (align === "none") return
        const L = (window as any).L
        mcg.eachLayer((layer: any) => {
          if (typeof layer.getChildCount !== "function" || layer.getChildCount() <= 1) return
          if (typeof layer.getAllChildMarkers !== "function") return
          let target: any = null
          if (align === "bounds") target = layer.getBounds().getCenter()
          if (align === "mean") {
            const children: any[] = layer.getAllChildMarkers()
            let sLat = 0, sLng = 0
            children.forEach((m: any) => { const ll = m.getLatLng(); sLat += ll.lat; sLng += ll.lng })
            target = L.latLng(sLat/children.length, sLng/children.length)
          }
          if (target && typeof layer.setLatLng === "function") layer.setLatLng(target)
        })
      }

      const onZoomEnd = () => {
        requestAnimationFrame(() => { alignClusters(); drawDebugForClusters() })
      }
      map.on("zoomend", onZoomEnd)
      ;(mcg as any).on?.("animationend", onZoomEnd)

      // Initial debug draw
      setTimeout(onZoomEnd, 300)
    }

    loadLeaflet().catch(console.error)
  }, [align])

  const stepZoom = (delta: number) => {
    const L = (window as any).L
    const map = (L && mapRef.current) ? (L as any).map?.instance : null
    // Instead of accessing internal instance, use global: find first map
    const first = (L as any)?.map?.instances?.[0] || (L as any)?.Map?.instances?.[0]
    const m = first || (L as any)._lastMap || (L as any).lastMap
    try {
      const current = m?.getZoom?.() ?? 11
      m?.setZoom?.(current + delta)
    } catch {}
  }

  return (
    <div className="w-full h-svh">
      <div ref={mapRef} className="w-full h-full" />
      <div style={{position:'absolute', top: 8, left: 8, background:'rgba(0,0,0,0.75)', color:'#ffb000', padding:8, fontFamily:'monospace', fontSize:12, zIndex:5000, maxWidth: 360}}>
        <div><b>Cluster Test</b></div>
        <div>align: 
          <select value={align} onChange={e => setAlign(e.target.value as AlignMode)}>
            <option value="none">none</option>
            <option value="bounds">bounds</option>
            <option value="mean">mean</option>
          </select>
        </div>
        <div style={{marginTop:6, lineHeight:1.4}}>
          Dots: <span style={{color:'#ffb000'}}>plugin</span>, <span style={{color:'#00bfff'}}>bounds</span>, <span style={{color:'#00ff88'}}>mean</span><br/>
          Cluster border color reflects current mode.
        </div>
        <div style={{marginTop:6}}>
          points param example:<br />
          ?points=33.83,-117.23;33.85,-117.23;33.87,-117.23;33.89,-117.23
        </div>
      </div>
    </div>
  )
}
