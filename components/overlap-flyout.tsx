import React from 'react'
import type { Item as Incident } from '@/lib/scrape'

export type OverlapFlyoutProps = {
  items: Incident[]
  lat: number
  lon: number
  anchor?: { x: number; y: number }
  onSelect: (item: Incident) => void
  onClose: () => void
}

export default function OverlapFlyout({ items, lat, lon, anchor, onSelect, onClose }: OverlapFlyoutProps) {
  const colorForPriority = (p: number) => {
    if (p <= 20) return '#ef4444'
    if (p <= 40) return '#f97316'
    if (p <= 60) return '#eab308'
    if (p <= 80) return '#84cc16'
    return '#06b6d4'
  }
  return (
    <div
      className="cyber-flyout"
      style={{ position: 'absolute', left: anchor ? anchor.x : 14, top: anchor ? anchor.y : 14, zIndex: 5000 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="cyber-flyout-inner">
        <div className="cyber-flyout-header">
          <span>{items.length} INCIDENTS @ {lat.toFixed(4)}, {lon.toFixed(4)}</span>
          <button className="cyber-close" onClick={onClose}>×</button>
        </div>
        <div className="cyber-flyout-list">
          {items.slice(0, 10).map((it) => (
            <button key={it.incident_id} className="cyber-item" onClick={() => onSelect(it)}>
              <span className="badge" style={{ background: colorForPriority(it.priority) }} />
              <span className="id">{it.incident_id}</span>
              <span className="type">{it.call_type}</span>
              <span className="area">{it.area ?? ''}</span>
            </button>
          ))}
          {items.length > 10 && <div className="cyber-note">+ {items.length - 10} more…</div>}
        </div>
      </div>
      <style jsx global>{`
        .cyber-flyout-inner{width:248px;background:rgba(0,0,0,0.92);border:2px solid #ffb000;box-shadow:0 0 16px rgba(255,176,0,0.6), inset 0 0 12px rgba(255,176,0,0.2);font-family:"IBM Plex Mono","Courier New",monospace;color:#ffb000}
        .cyber-flyout-header{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;font-weight:bold;letter-spacing:.5px;background:linear-gradient(90deg, rgba(255,176,0,0.15), rgba(0,0,0,0))}
        .cyber-close{color:#ffb000;background:transparent;border:none;font-size:18px;cursor:pointer}
        .cyber-flyout-list{display:flex;flex-direction:column;max-height:180px;overflow:auto}
        .cyber-item{display:grid;grid-template-columns:10px 1fr;grid-template-rows:auto auto;gap:4px 8px;text-align:left;padding:8px 10px;background:transparent;border:none;color:#ffb000;cursor:pointer}
        .cyber-item:hover{background:rgba(255,176,0,0.08)}
        .cyber-item .badge{grid-row:span 2;width:10px;height:100%;display:block}
        .cyber-item .id{font-size:11px;opacity:.75}
        .cyber-item .type{font-size:12px;font-weight:700;letter-spacing:.3px}
        .cyber-item .area{font-size:11px;opacity:.7}
        .cyber-note{padding:6px 10px;font-size:11px;opacity:.7}
      `}</style>
    </div>
  )
}

