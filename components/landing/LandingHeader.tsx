'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/routing'
import { AuthNav } from '@/components/auth/AuthNav'

interface LandingHeaderProps {
  userEmail: string | null
}

export function LandingHeader({ userEmail }: LandingHeaderProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={[
        'sticky top-0 z-50 w-full bg-page/80 backdrop-blur-md transition-colors',
        scrolled ? 'border-b border-line' : 'border-b border-transparent',
      ].join(' ')}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4 lg:px-10">
        <Link
          href="/"
          aria-label="DeutschTest.pro"
          className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page rounded-rad-pill"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-rad-pill bg-ink font-display text-sm text-card"
          >
            ß
          </span>
          <span className="hidden font-mono text-sm text-muted sm:inline">
            deutschtest.pro
          </span>
        </Link>

        <AuthNav userEmail={userEmail} />
      </div>
    </header>
  )
}
