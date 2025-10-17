import './globals.css';
import type { Metadata } from 'next';
import { Courier_Prime } from 'next/font/google';

const courierPrime = Courier_Prime({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-courier-prime',
});

export const metadata: Metadata = {
  title: 'RSO PressAccess Intelligence',
  description: 'Live Riverside Sheriff incident intelligence with on-the-fly geocoding and responsive mapping.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className={courierPrime.className}>{children}</body>
    </html>
  );
}
