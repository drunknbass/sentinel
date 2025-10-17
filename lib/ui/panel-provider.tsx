"use client"
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'

export type PanelType = 'filters' | 'incidents' | 'critical' | 'bottomSheet' | null

type PanelContextValue = {
  current: PanelType
  isAnyOpen: boolean
  open: (panel: Exclude<PanelType, null>) => void
  toggle: (panel: Exclude<PanelType, null>) => void
  close: () => void
  isOpen: (panel: Exclude<PanelType, null>) => boolean
}

const PanelContext = createContext<PanelContextValue | null>(null)

export function PanelProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<PanelType>(null)
  const isMobile = useIsMobile()

  const value: PanelContextValue = useMemo(() => ({
    current,
    isAnyOpen: current !== null,
    open: (p) => setCurrent(p),
    toggle: (p) => setCurrent((prev) => (prev === p ? null : p)),
    close: () => setCurrent(null),
    isOpen: (p) => current === p
  }), [current])

  // Global body scroll lock when any mobile panel is open
  useEffect(() => {
    if (!isMobile) return
    if (value.isAnyOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [isMobile, value.isAnyOpen])

  return (
    <PanelContext.Provider value={value}>{children}</PanelContext.Provider>
  )
}

export function usePanel() {
  const ctx = useContext(PanelContext)
  if (!ctx) throw new Error('usePanel must be used within PanelProvider')
  return ctx
}

