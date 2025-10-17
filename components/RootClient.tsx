"use client"
import { useEffect } from 'react'
import { installGlobalFirstTapPrompt } from '@/lib/gps-bridge'

export default function RootClient({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    installGlobalFirstTapPrompt()
  }, [])
  return <>{children}</>
}

