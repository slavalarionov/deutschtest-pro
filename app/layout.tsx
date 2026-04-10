import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import './globals.css'

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
    <html lang="de" className={GeistSans.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  )
}
