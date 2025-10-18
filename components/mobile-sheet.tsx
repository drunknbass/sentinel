"use client"
import { Sheet } from "react-modal-sheet"
import { X } from "lucide-react"
import React from "react"

type MobileSheetProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  snapPoints?: number[]
  initialSnap?: number
  disableBackdrop?: boolean
}

export default function MobileSheet({ open, onClose, title, children, snapPoints = [0, 0.5, 0.9], initialSnap = 1, disableBackdrop = false }: MobileSheetProps) {
  return (
    <Sheet
      isOpen={open}
      onClose={onClose}
      snapPoints={snapPoints}
      initialSnap={initialSnap}
    >
      <Sheet.Container
        style={{
          backgroundColor: '#000000',
          borderTop: '4px solid #ffb000',
          boxShadow: '0 0 16px rgba(255, 176, 0, 0.3)',
        }}
      >
        <Sheet.Header
          style={{
            backgroundColor: '#000000',
            borderBottom: '2px solid #ffb000',
            padding: '0',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-black relative">
            {/* Drag handle */}
            <div className="h-1.5 w-12 mx-auto absolute left-1/2 -translate-x-1/2 -top-3 rounded bg-amber-500/60" />

            {/* Title */}
            <div className="text-xs font-mono font-bold text-amber-500 tracking-wider uppercase">
              {title && `╔ ${title} ╗`}
            </div>

            {/* Close button */}
            <button
              aria-label="Close"
              onClick={onClose}
              className="ml-auto w-8 h-8 border-2 border-amber-500 text-amber-500 font-mono font-bold hover:bg-amber-500 hover:text-black transition-all"
            >
              X
            </button>
          </div>
        </Sheet.Header>

        <Sheet.Content
          style={{
            backgroundColor: '#000000',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
          className="font-mono text-amber-500"
        >
          {children}
        </Sheet.Content>
      </Sheet.Container>

      {!disableBackdrop && (
        <Sheet.Backdrop
          onTap={onClose}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
          }}
        />
      )}
    </Sheet>
  )
}

