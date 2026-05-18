import type { Metadata } from 'next'
import '../styles/global.css'

export const metadata: Metadata = {
  title: {
    default: 'OVERDRIVE PERMITS - Trucking Permits Platform',
    template: '%s | OVERDRIVE PERMITS',
  },
  description: 'Your trusted partner for trucking permits across all 50 US states. Fast, reliable, and compliant permit solutions for oversized, overweight, and superload cargo transportation.',
  keywords: [
    'trucking permits',
    'oversized cargo permits',
    'overweight permits',
    'superload permits',
    'trucking regulations',
    'state permits',
    'commercial trucking',
    'freight permits',
    'transportation permits',
    'US trucking permits',
  ],
  authors: [{ name: 'OVERDRIVE PERMITS' }],
  creator: 'OVERDRIVE PERMITS',
  publisher: 'OVERDRIVE PERMITS',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://overdrivepermits.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'OVERDRIVE PERMITS - Trucking Permits Platform',
    description: 'Your trusted partner for trucking permits across all 50 US states. Fast, reliable, and compliant permit solutions.',
    siteName: 'OVERDRIVE PERMITS',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'OVERDRIVE PERMITS Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OVERDRIVE PERMITS - Trucking Permits Platform',
    description: 'Your trusted partner for trucking permits across all 50 US states.',
    images: ['/logo.png'],
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
  verification: {
    // Add your verification codes here when available
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
