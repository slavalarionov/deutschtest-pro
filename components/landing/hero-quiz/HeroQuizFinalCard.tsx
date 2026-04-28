'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

interface HeroQuizFinalCardProps {
  correctCount: number
  className?: string
}

export function HeroQuizFinalCard({
  correctCount,
  className = '',
}: HeroQuizFinalCardProps) {
  const t = useTranslations('landing.heroQuiz')

  return (
    <div
      className={`rounded-rad-sm border border-line bg-card p-4 shadow-lift ${className}`}
      style={{ minHeight: 180 }}
    >
      <div className="mb-3 flex items-center">
        <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
          {t('ergebnisLabel')} · {correctCount} / 10
        </span>
      </div>

      <p className="text-sm text-ink">{t('final.question')}</p>

      <Link
        href="/register"
        className="mt-4 inline-flex items-center gap-1.5 rounded-rad-pill bg-ink px-4 py-2.5 text-xs font-medium text-card transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
        {t('final.cta')}
        <svg
          width="12"
          height="12"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 10h10M11 6l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
    </div>
  )
}
