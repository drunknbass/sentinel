import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/lib/themes/theme-provider';
import { PanelProvider } from '@/lib/ui/panel-provider';
import RootClient from '@/components/RootClient';
import TosGate from '@/components/TosGate';

export const metadata: Metadata = {
  title: 'RSO PressAccess Intelligence',
  description: 'Live Riverside Sheriff incident intelligence with on-the-fly geocoding and responsive mapping.'
};

// Lock page zoom and fit to device viewport (preferred Next.js way)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="mobile-lock-select">
        <PanelProvider>
          <ThemeProvider defaultTheme="amber-mdt">
            <RootClient>
              {children}
              <TosGate />
            </RootClient>
          </ThemeProvider>
        </PanelProvider>
      </body>
    </html>
  );
}
