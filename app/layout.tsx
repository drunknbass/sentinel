import './globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from '@/lib/themes/theme-provider';

export const metadata: Metadata = {
  title: 'RSO PressAccess Intelligence',
  description: 'Live Riverside Sheriff incident intelligence with on-the-fly geocoding and responsive mapping.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider defaultTheme="amber-mdt">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
