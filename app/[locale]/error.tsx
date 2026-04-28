'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Footer } from '@/components/landing/Footer'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errorPages.serverError')

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <>
    <div
      data-testid="error-page-500"
      className="flex min-h-screen flex-col items-center justify-center bg-page px-4 py-20"
    >
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {t('eyebrow')}
        </div>
        <h1 className="text-balance font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
          {t('titleLine1')}
          <br />
          <span className="text-ink-soft">{t('titleLine2')}</span>
        </h1>
        <p className="mx-auto max-w-md text-base leading-relaxed text-muted">
          {t('description')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            data-testid="error-cta-retry"
            onClick={reset}
            className="rounded-rad-pill bg-ink px-8 py-3 text-sm font-medium text-card transition-colors hover:bg-ink/90"
          >
            {t('ctaRetry')}
          </button>
          <Link
            href="/"
            data-testid="error-cta-home"
            className="rounded-rad-pill border border-line bg-card px-8 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface"
          >
            {t('ctaHome')}
          </Link>
        </div>
      </div>
    </div>
    <Footer />
    </>
  )
}
