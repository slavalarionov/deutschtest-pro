'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import type { Recommendations } from '@/lib/claude'
import type { RecommendationsPayload } from '@/lib/dashboard/recommendations'
import { formatEditorialDate } from '@/lib/format/date'

export function RecommendationsView() {
  const t = useTranslations('dashboard.recommendations')
  const [data, setData] = useState<RecommendationsPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(
    async (opts: { refresh?: boolean } = {}) => {
      const isRefresh = Boolean(opts.refresh)
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)

      try {
        const url = isRefresh
          ? '/api/dashboard/recommendations?refresh=1'
          : '/api/dashboard/recommendations'
        const res = await fetch(url, { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok || !json.success) {
          setError(json.error || t('errors.loadFailed'))
          return
        }
        setData(json.data as RecommendationsPayload)
      } catch {
        setError(t('errors.network'))
      } finally {
        if (isRefresh) setRefreshing(false)
        else setLoading(false)
      }
    },
    [t]
  )

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 md:px-10 md:py-14">
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : !data || !data.recommendations ? (
        <EmptyState />
      ) : (
        <LoadedState
          data={data}
          refreshing={refreshing}
          onRefresh={() => load({ refresh: true })}
        />
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="h-3 w-56 animate-pulse rounded bg-line" />
        <div className="h-20 w-full animate-pulse rounded-rad-sm bg-line-soft" />
        <div className="h-3 w-40 animate-pulse rounded bg-line" />
      </div>
      <div className="mt-8 space-y-5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-40 w-full animate-pulse rounded-rad border border-line bg-card"
          />
        ))}
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTranslations('dashboard.recommendations')
  return (
    <div className="rounded-rad-sm border border-error/20 bg-error-soft p-8">
      <div className="font-mono text-[11px] uppercase tracking-[0.02em] text-error">
        {t('error.eyebrow')}
      </div>
      <p className="mt-4 text-lg leading-relaxed text-ink">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-rad-pill border border-line px-4 py-2 text-sm text-ink-soft transition-colors hover:text-ink"
      >
        {t('error.retry')}
      </button>
    </div>
  )
}

function EmptyState() {
  const t = useTranslations('dashboard.recommendations')
  return (
    <div className="rounded-rad border border-line bg-card p-10 text-center md:p-14">
      <div className="font-mono text-[11px] uppercase tracking-[0.02em] text-muted">
        {t('empty.eyebrowV2')}
      </div>
      <h2 className="mt-6 font-display text-4xl tracking-tight text-ink md:text-5xl md:tracking-snug">
        {t('empty.titleV2')}
      </h2>
      <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-ink-soft">
        {t('empty.leadV2')}
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex items-center gap-2 rounded-rad-pill bg-ink px-5 py-2.5 text-sm text-page transition-colors hover:bg-ink-soft"
      >
        {t('empty.ctaV2')}
      </Link>
    </div>
  )
}

function LoadedState({
  data,
  refreshing,
  onRefresh,
}: {
  data: RecommendationsPayload
  refreshing: boolean
  onRefresh: () => void
}) {
  const t = useTranslations('dashboard.recommendations')
  const locale = useLocale()
  const recs = data.recommendations!
  const dateLabel = data.generatedAt
    ? formatEditorialDate(data.generatedAt, locale).toLocaleUpperCase(locale)
    : '—'

  return (
    <div className="space-y-10">
      <Header
        attemptsCount={data.attemptsCount}
        dateLabel={dateLabel}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      <div className="space-y-5">
        <section className="rounded-rad border border-line bg-card p-8">
          <Eyebrow>{t('sections.overallEyebrow')}</Eyebrow>
          <p className="mt-4 whitespace-pre-wrap text-lg leading-relaxed text-ink">
            {recs.overallAssessment}
          </p>
        </section>

        {recs.strengths.length > 0 && (
          <section className="rounded-rad border border-line bg-card p-8">
            <Eyebrow>{t('sections.strengthsEyebrow')}</Eyebrow>
            <ul className="mt-4 space-y-3">
              {recs.strengths.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-accent"
                    aria-hidden="true"
                  />
                  <span className="text-base text-ink-soft">{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {recs.weaknesses.length > 0 && (
          <section className="rounded-rad border border-line bg-card p-8">
            <Eyebrow>{t('sections.weaknessesEyebrow')}</Eyebrow>
            <ul className="mt-4 space-y-3">
              {recs.weaknesses.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-muted"
                    aria-hidden="true"
                  />
                  <span className="text-base text-ink-soft">{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {recs.studyPlan.length > 0 && (
          <section className="rounded-rad border border-line bg-card p-8">
            <Eyebrow>
              {t('sections.studyPlanEyebrow', { count: recs.studyPlan.length })}
            </Eyebrow>
            <ol className="mt-6">
              {recs.studyPlan.map((step, i) => (
                <li
                  key={i}
                  className="mb-5 flex items-start gap-4 border-b border-line pb-5 last:mb-0 last:border-0 last:pb-0"
                >
                  <span className="w-6 flex-shrink-0 pt-0.5 font-mono text-sm text-muted">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1">
                    <p className="font-display text-lg text-ink tracking-[-0.02em]">
                      {step.title}
                    </p>
                    <p className="mt-1 text-base leading-relaxed text-ink-soft">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="rounded-rad border border-accent/20 bg-accent-soft p-8">
          <div className="font-mono text-[11px] uppercase tracking-[0.02em] text-accent-ink">
            {t('sections.motivationEyebrow')}
          </div>
          <p className="mt-4 whitespace-pre-wrap text-lg leading-relaxed text-accent-ink">
            {recs.motivation}
          </p>
        </section>
      </div>
    </div>
  )
}

function Header({
  attemptsCount,
  dateLabel,
  refreshing,
  onRefresh,
}: {
  attemptsCount: number
  dateLabel: string
  refreshing: boolean
  onRefresh: () => void
}) {
  const t = useTranslations('dashboard.recommendations')

  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex-1">
        <div className="font-mono text-[11px] uppercase tracking-[0.02em] text-muted">
          {t('eyebrow')}
        </div>
        <h1 className="mt-4 font-display text-6xl leading-[1] tracking-[-0.035em] text-ink md:text-7xl">
          {t('headline.strong')}
          <br />
          <span className="text-ink-soft">{t('headline.muted')}</span>
        </h1>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.02em] text-muted">
          {t('meta.modulesConsidered', { count: attemptsCount })}
          {' · '}
          {t('meta.generatedAt', { date: dateLabel })}
        </p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="inline-flex flex-shrink-0 items-center gap-2 rounded-rad-pill border border-line px-4 py-2 text-sm text-ink-soft transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {refreshing ? (
          <SpinnerIcon />
        ) : (
          <RefreshIcon />
        )}
        {refreshing ? t('refresh.busy') : t('refresh.button')}
      </button>
    </header>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[11px] uppercase tracking-[0.02em] text-muted">
      {children}
    </div>
  )
}

function RefreshIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 1 3 6.7" />
      <path d="M3 20v-4h4" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="animate-spin"
      aria-hidden="true"
    >
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  )
}
