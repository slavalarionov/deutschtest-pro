'use client'

import { useTranslations } from 'next-intl'

interface TimeUpOverlayProps {
  /** Optional extra line under the main message */
  detail?: string
}

export function TimeUpOverlay({ detail }: TimeUpOverlayProps) {
  const t = useTranslations('exam.timer')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-page/80 p-4">
      <div className="w-full max-w-md rounded-rad border border-line bg-card p-10 text-center shadow-lift">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-rad-pill border border-line bg-surface text-ink-soft">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
        </div>
        <div className="mb-3 font-mono text-[11px] uppercase tracking-wider text-muted">
          {t('redirecting')}
        </div>
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          {t('timeUpTitle')}
        </h2>
        <p className="mt-3 text-sm text-ink-soft">{t('timeUpMessage')}</p>
        {detail && (
          <p className="mt-2 font-mono text-xs uppercase tracking-wider text-muted">
            {detail}
          </p>
        )}
        <div className="mx-auto mt-8 h-1 w-40 overflow-hidden rounded-rad-pill bg-line">
          <div className="h-full animate-progress rounded-rad-pill bg-ink" />
        </div>
      </div>
    </div>
  )
}
