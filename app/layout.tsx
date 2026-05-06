import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/app/components/Providers';

export const metadata: Metadata = {
  title: 'Forge | Gaming Social Network',
  description: 'Track your game library, connect with gamers, and share what you\'re playing.',
  manifest: '/manifest.json',
  icons: { apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#140e22',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
