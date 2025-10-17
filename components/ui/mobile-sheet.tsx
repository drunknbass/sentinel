"use client"
import { BottomSheet } from "react-spring-bottom-sheet"
import { X } from "lucide-react"
import React from "react"

type MobileSheetProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export default function MobileSheet({ open, onClose, title, children }: MobileSheetProps) {
  return (
    <BottomSheet
      open={open}
      onDismiss={onClose}
      blocking={true}
      expandOnContentDrag
      snapPoints={({ minHeight, maxHeight }: { minHeight: number; maxHeight: number }) => [minHeight + 80, Math.min(maxHeight, window.innerHeight * 0.85)]}
      defaultSnap={({ maxHeight }: { maxHeight: number }) => Math.min(maxHeight, window.innerHeight * 0.6)}
      header={
        <div className="flex items-center justify-between px-4 py-3 bg-black border-b-2 border-amber-500">
          <div className="h-1.5 w-12 mx-auto absolute left-1/2 -translate-x-1/2 -top-1 rounded bg-amber-500/60" />
          <div className="text-xs font-mono font-bold text-amber-500 tracking-wider">{title ?? ""}</div>
          <button aria-label="Close" onClick={onClose} className="ml-auto border-2 border-amber-500 text-amber-500 px-2 py-1 font-mono text-xs hover:bg-amber-500 hover:text-black">
            <X className="w-4 h-4" />
          </button>
        </div>
      }
      className="bg-black text-amber-500 border-t-2 border-amber-500 allow-text-select"
    >
      <div className="p-4">
        {children}
      </div>
    </BottomSheet>
  )
}
