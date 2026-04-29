import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
// Locally-bundled variable fonts (one .woff2 per family covers every weight
// in use). The original next/font/google call broke Timeweb's Docker build
// with `getaddrinfo EAI_AGAIN fonts.googleapis.com` whenever the build host
// couldn't reach the Google CDN. Bundling through @fontsource removes the
// network dependency entirely. The three fonts register the
// `Inter Variable`, `Inter Tight Variable` and `JetBrains Mono Variable`
// font-family names; the matching `--font-*` CSS variables live in
// app/globals.css so Tailwind's `var(--font-*)` lookups still resolve.
import '@fontsource-variable/inter'
import '@fontsource-variable/inter-tight'
import '@fontsource-variable/jetbrains-mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'DeutschTest.pro — AI-Simulator Goethe-Zertifikat',
  description:
    'Bereiten Sie sich mit KI-generierten Prüfungen auf das Goethe-Zertifikat vor. Lesen, Hören, Schreiben, Sprechen — alles in einer Plattform.',
  keywords: ['Goethe-Zertifikat', 'Deutsch', 'A1', 'A2', 'B1', 'exam', 'simulator', 'AI'],
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'DeutschTest.pro — AI-Simulator Goethe-Zertifikat',
    description:
      'Bereiten Sie sich mit KI-generierten Prüfungen auf das Goethe-Zertifikat vor. Lesen, Hören, Schreiben, Sprechen — alles in einer Plattform.',
    url: 'https://deutschtest.pro',
    siteName: 'DeutschTest.pro',
    images: [
      {
        url: 'https://deutschtest.pro/icon-mark.svg',
        width: 1200,
        height: 630,
        alt: 'DeutschTest.pro',
      },
    ],
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className={GeistSans.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  )
}
