'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import type { Recommendations } from '@/lib/claude'
import type { RecommendationsPayload } from '@/lib/dashboard/recommendations'

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

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
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">{t('title')}</h1>
          <p className="mt-1 text-sm text-brand-muted">{t('subtitle')}</p>
        </div>
        {data && data.recommendations && (
          <button
            type="button"
            onClick={() => load({ refresh: true })}
            disabled={refreshing}
            className="inline-flex items-center justify-center rounded-lg border border-brand-border bg-brand-white px-4 py-2 text-sm font-semibold text-brand-text hover:bg-brand-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? t('refreshingButton') : t('refreshButton')}
          </button>
        )}
      </div>

      {loading && <LoadingCard text={t('loading')} />}

      {!loading && error && (
        <div className="rounded-2xl bg-brand-white px-6 py-10 text-center shadow-soft">
          <p className="text-sm text-brand-red">{error}</p>
          <button
            type="button"
            onClick={() => load()}
            className="mt-4 inline-block rounded-lg bg-brand-gold px-5 py-2 text-sm font-semibold text-white hover:bg-brand-gold-dark"
          >
            {t('retry')}
          </button>
        </div>
      )}

      {!loading && !error && data && !data.recommendations && (
        <div className="rounded-2xl bg-brand-white px-6 py-16 text-center shadow-soft">
          <p className="text-sm font-medium text-brand-text">
            {t('empty.title')}
          </p>
          <p className="mt-2 text-xs text-brand-muted">{t('empty.hint')}</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-lg bg-brand-gold px-5 py-2 text-sm font-semibold text-white hover:bg-brand-gold-dark"
          >
            {t('empty.toDashboard')}
          </Link>
        </div>
      )}

      {!loading && !error && data && data.recommendations && (
        <>
          {refreshing && <LoadingCard text={t('refreshing')} />}
          {!refreshing && (
            <RecommendationsContent
              recs={data.recommendations}
              attemptsCount={data.attemptsCount}
              generatedAt={data.generatedAt}
              cached={data.cached}
            />
          )}
        </>
      )}
    </div>
  )
}

function LoadingCard({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-brand-white px-6 py-16 shadow-soft">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-gold border-t-transparent" />
      <p className="text-sm text-brand-muted">{text}</p>
    </div>
  )
}

function RecommendationsContent({
  recs,
  attemptsCount,
  generatedAt,
  cached,
}: {
  recs: Recommendations
  attemptsCount: number
  generatedAt: string | null
  cached: boolean
}) {
  const t = useTranslations('dashboard.recommendations')
  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader title={t('sections.overall')} emoji="🎯" />
        <p className="text-sm leading-relaxed text-brand-text">{recs.overallAssessment}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-brand-muted">
          <span className="rounded-md bg-brand-surface px-2 py-0.5 font-medium">
            {t('modulesCount', { count: attemptsCount })}
          </span>
          <span>
            {cached
              ? t('cachedAt', { date: formatDateTime(generatedAt) })
              : t('generatedAt', { date: formatDateTime(generatedAt) })}
          </span>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <SectionHeader title={t('sections.strengths')} emoji="✅" />
          <ul className="space-y-2 text-sm text-brand-text">
            {recs.strengths.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionHeader title={t('sections.weaknesses')} emoji="⚠️" />
          <ul className="space-y-2 text-sm text-brand-text">
            {recs.weaknesses.map((w, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-red" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <SectionHeader title={t('sections.studyPlan')} emoji="🗺️" />
        <ol className="space-y-4">
          {recs.studyPlan.map((step, i) => (
            <li key={i} className="flex gap-3">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-gold text-xs font-bold text-white">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-text">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-brand-muted">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="bg-brand-gold/5">
        <SectionHeader title={t('sections.motivation')} emoji="💪" />
        <p className="text-sm leading-relaxed text-brand-text">{recs.motivation}</p>
      </Card>
    </div>
  )
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-2xl bg-brand-white p-6 shadow-soft ${className ?? ''}`}>
      {children}
    </div>
  )
}

function SectionHeader({ title, emoji }: { title: string; emoji: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="text-lg">{emoji}</span>
      <h2 className="text-base font-semibold text-brand-text">{title}</h2>
    </div>
  )
}
