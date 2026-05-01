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
          className="inline-flex items-center gap-2.5 rounded-rad-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-mark.svg"
            alt=""
            width={28}
            height={28}
            aria-hidden="true"
          />
          <span className="hidden font-display text-lg font-medium tracking-tight text-ink sm:inline">
            deutschtest<span className="text-muted">.pro</span>
          </span>
        </Link>

        <AuthNav userEmail={userEmail} />
      </div>
    </header>
  )
}
