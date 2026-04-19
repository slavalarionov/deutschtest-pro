import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { Inter_Tight, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const interTight = Inter_Tight({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-display',
  display: 'swap',
})

const interBody = Inter({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-body',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'DeutschTest.pro — AI-Simulator Goethe-Zertifikat',
  description:
    'Bereiten Sie sich mit KI-generierten Prüfungen auf das Goethe-Zertifikat vor. Lesen, Hören, Schreiben, Sprechen — alles in einer Plattform.',
  keywords: ['Goethe-Zertifikat', 'Deutsch', 'A1', 'A2', 'B1', 'exam', 'simulator', 'AI'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="de"
      className={`${GeistSans.variable} ${interTight.variable} ${interBody.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  )
}
