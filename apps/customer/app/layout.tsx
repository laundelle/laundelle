import type { Metadata, Viewport } from 'next';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-outfit',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0d3462',
};

const getBaseUrl = (fallback: string) => {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
  }
  return fallback;
};

const baseUrl = getBaseUrl('https://laundelle.co.uk');

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'LAUNDELLE — Laundry & Delivery',
    template: '%s | LAUNDELLE',
  },
  description:
    'LAUNDELLE is a modern laundry and delivery platform that makes booking, pickup, cleaning, tracking, and delivery simple and convenient.',
  applicationName: 'LAUNDELLE',
  authors: [{ name: 'LAUNDELLE' }],
  creator: 'LAUNDELLE',
  publisher: 'LAUNDELLE',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon_io/favicon.ico' },
      { url: '/favicon_io/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon_io/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/favicon_io/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon_io/favicon.ico',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: baseUrl,
    siteName: 'LAUNDELLE',
    title: 'LAUNDELLE — Laundry & Delivery',
    description:
      'LAUNDELLE is a modern laundry and delivery platform that makes booking, pickup, cleaning, tracking, and delivery simple and convenient.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'LAUNDELLE — Smart Laundry & Delivery',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LAUNDELLE — Laundry & Delivery',
    description:
      'LAUNDELLE is a modern laundry and delivery platform that makes booking, pickup, cleaning, tracking, and delivery simple and convenient.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

import { Auth0ProviderWrapper } from '../components/Auth0ProviderWrapper';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${plusJakartaSans.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#f8fafc] text-gray-900 font-sans antialiased">
        <Auth0ProviderWrapper>
          {children}
        </Auth0ProviderWrapper>
      </body>
    </html>
  );
}
