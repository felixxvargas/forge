import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/app/components/Providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://forge-social.app'),
  title: 'Forge | Gaming Social Network',
  description: 'Track your game library, connect with gamers, and share what you\'re playing.',
  openGraph: {
    title: 'Forge | Gaming Social Network',
    description: 'Track your game library, connect with gamers, and share what you\'re playing.',
    url: 'https://forge-social.app',
    siteName: 'Forge',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Forge — Gaming Social Network' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#140e22',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://xmxeafjpscgqprrreulh.supabase.co" />
        <link rel="dns-prefetch" href="https://xmxeafjpscgqprrreulh.supabase.co" />
      </head>
      <body className="overflow-x-hidden max-w-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
