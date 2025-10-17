import type React from "react"
import type { Metadata } from "next"
import { IBM_Plex_Mono } from "next/font/google"
import "./globals.css"

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "RSO MDT - Mobile Data Terminal",
  description: "Riverside Sheriff Office Mobile Data Terminal - Real-time incident tracking",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={ibmPlexMono.className}>{children}</body>
    </html>
  )
}
