'use client'

import { useLocale, useTranslations } from 'next-intl'
import { ScorePraedikat } from '@/components/results/ScorePraedikat'
import { formatEditorialDate } from '@/lib/format/date'
import { getPraedikat } from '@/lib/grading/praedikat'

interface Props {
  score: number | undefined
  /** Already-localized module label (e.g. "Schreiben", "Hören"). */
  moduleLabel: string
  /** Goethe level — "A1" / "A2" / "B1" (any case; rendered uppercase). */
  level: string
  /** ISO timestamp; when present the eyebrow includes localized date+time. */
  submittedAt?: string | null
  size?: 'lg' | 'md'
}

export function ScoreHero({
  score,
  moduleLabel,
  level,
  submittedAt,
  size = 'lg',
}: Props) {
  const locale = useLocale()
  const t = useTranslations('results.scoreCard')
  const tPraedikat = useTranslations('results.praedikat.label')

  const upperModule = moduleLabel.toLocaleUpperCase(locale)
  const upperLevel = level.toUpperCase()
  const formattedDate = submittedAt ? formatEditorialDate(submittedAt, locale) : null
  const formattedTime = submittedAt
    ? new Date(submittedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : null

  const eyebrow =
    formattedDate && formattedTime
      ? t('eyebrow', { module: upperModule, level: upperLevel, date: formattedDate, time: formattedTime })
      : `${upperModule} · ${upperLevel}`

  const valueClass =
    size === 'lg'
      ? 'font-display text-[80px] leading-none tracking-[-0.04em] text-ink tabular-nums sm:text-[120px] md:text-[140px]'
      : 'font-display text-[64px] leading-none tracking-[-0.04em] text-ink tabular-nums sm:text-[88px]'

  if (score === undefined) {
    return (
      <div
        data-testid="result-score-hero"
        className="rounded-rad border border-line bg-card p-6 sm:p-10"
      >
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {eyebrow}
        </div>
        <div data-testid="result-score-value" className={`mt-6 ${valueClass}`}>
          —
        </div>
      </div>
    )
  }

  const praedikat = getPraedikat(score)

  return (
    <div
      data-testid="result-score-hero"
      className="rounded-rad border border-l-2 border-line bg-card p-6 sm:border-l-4 sm:p-10"
      style={{ borderLeftColor: praedikat.cssColor }}
    >
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
        {eyebrow}
      </div>

      <div className="mt-6 flex flex-col gap-6 sm:mt-8 sm:flex-row sm:items-center sm:gap-10">
        <div className="flex items-end gap-3">
          <div data-testid="result-score-value" className={valueClass}>
            {score}
          </div>
          <div className="pb-2 font-mono text-sm text-muted sm:pb-4">
            {t('outOf')}
          </div>
        </div>

        <div
          data-testid="result-status"
          data-passed={praedikat.passed ? 'true' : 'false'}
          className="sm:pb-2"
        >
          <ScorePraedikat
            praedikat={praedikat}
            translation={tPraedikat(praedikat.level)}
            size={size}
          />
        </div>
      </div>
    </div>
  )
}
