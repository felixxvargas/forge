import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/app/components/Providers';

export const metadata: Metadata = {
  title: 'Forge | Gaming Social Network',
  description: 'Track your game library, connect with gamers, and share what you\'re playing.',
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
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
