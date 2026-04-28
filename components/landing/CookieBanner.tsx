'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

const COOKIE_NAME = 'cookie-consent'
const COOKIE_MAX_AGE_DAYS = 365

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(
    new RegExp(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`),
  )
  return match ? decodeURIComponent(match[2]) : null
}

function setCookie(name: string, value: string, days: number) {
  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/; SameSite=Lax`
}

export function CookieBanner() {
  const t = useTranslations('cookieBanner')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!getCookie(COOKIE_NAME)) {
      const timer = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  function handleAcceptAll() {
    setCookie(COOKIE_NAME, 'all', COOKIE_MAX_AGE_DAYS)
    setVisible(false)
  }

  function handleEssentialOnly() {
    setCookie(COOKIE_NAME, 'essential', COOKIE_MAX_AGE_DAYS)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-card shadow-lift"
    >
      <div className="mx-auto max-w-7xl px-6 py-6 lg:px-12 lg:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-12">
          <div className="flex-1">
            <h2
              id="cookie-banner-title"
              className="mb-2 font-display text-lg text-ink"
            >
              {t('title')}
            </h2>
            <p className="text-sm leading-relaxed text-ink-soft">
              {t('description')}{' '}
              <Link
                href="/privacy"
                className="text-accent-ink underline underline-offset-2 hover:text-accent"
              >
                {t('learnMore')}
              </Link>
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleEssentialOnly}
              className="rounded-rad border border-line px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface"
            >
              {t('essentialOnly')}
            </button>
            <button
              type="button"
              onClick={handleAcceptAll}
              className="rounded-rad bg-ink px-5 py-3 text-sm font-medium text-card transition-opacity hover:opacity-90"
            >
              {t('acceptAll')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
