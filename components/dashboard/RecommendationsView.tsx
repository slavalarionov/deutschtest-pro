'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import type { WeakArea } from '@/lib/claude'
import type {
  MatchedResource,
  MatchedResourcesIndex,
  RecommendationsSnapshot,
} from '@/lib/recommendations/snapshot'
import type { RecommendationsPayload } from '@/lib/dashboard/recommendations'
import { formatEditorialDate } from '@/lib/format/date'
import { getTagLabel, type LearningTag } from '@/lib/learning-tags'
import { ShareSection } from '@/components/exam/ShareSection'
import type { Locale } from '@/i18n/request'

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
    [t],
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
      ) : !data || !data.snapshot ? (
        <EmptyState />
      ) : (
        <LoadedState
          snapshot={data.snapshot}
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

const SEVERITY_COLOR: Record<WeakArea['severity'], string> = {
  high: 'var(--error)',
  medium: 'var(--warn)',
  low: 'var(--accent)',
}

function LoadedState({
  snapshot,
  refreshing,
  onRefresh,
}: {
  snapshot: RecommendationsSnapshot
  refreshing: boolean
  onRefresh: () => void
}) {
  const t = useTranslations('dashboard.recommendations')
  const tModules = useTranslations('modules')
  const tPublic = useTranslations('recommendations.public')
  const tTypes = useTranslations('recommendations.resourceTypes')
  const locale = useLocale() as Locale

  const dateLabel = formatEditorialDate(snapshot.generated_at, locale).toLocaleUpperCase(locale)
  const matched = snapshot.matched_resources as MatchedResourcesIndex

  return (
    <div className="space-y-10">
      <Header
        attemptsCount={snapshot.attempts_count}
        dateLabel={dateLabel}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      <section className="rounded-rad border border-line bg-card p-8">
        <Eyebrow>{tPublic('summaryEyebrow')}</Eyebrow>
        <p className="mt-4 whitespace-pre-wrap text-lg leading-relaxed text-ink">
          {snapshot.summary_text}
        </p>
      </section>

      <div className="space-y-5">
        <Eyebrow>{tPublic('areasEyebrow', { count: snapshot.weak_areas.length })}</Eyebrow>

        {snapshot.weak_areas.map((area, i) => {
          const key = `${area.module}:${area.level}:${area.topic}`
          const resources = matched[key] ?? []
          const moduleLabel = tModules(area.module)
          const tagLabel = getTagLabel(area.topic as LearningTag, locale)

          return (
            <article
              key={i}
              className="rounded-rad border border-l-2 border-line bg-card p-6 sm:border-l-4 sm:p-8"
              style={{ borderLeftColor: SEVERITY_COLOR[area.severity] }}
            >
              <div className="flex flex-wrap items-baseline gap-3 font-mono text-[10px] uppercase tracking-widest text-muted">
                <span>{moduleLabel.toLocaleUpperCase(locale)}</span>
                <span>·</span>
                <span>{area.level.toUpperCase()}</span>
                <span>·</span>
                <span style={{ color: SEVERITY_COLOR[area.severity] }}>
                  {tPublic(`severity.${area.severity}`)}
                </span>
              </div>
              <h2 className="mt-4 font-display text-3xl leading-tight tracking-[-0.02em] text-ink sm:text-4xl">
                {tagLabel}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-soft">{area.reason}</p>

              {resources.length === 0 ? (
                <div className="mt-6 border-t border-line-soft pt-4">
                  <p className="text-sm italic text-muted">{tPublic('resourcesEmpty')}</p>
                </div>
              ) : (
                <div className="mt-6 space-y-3 border-t border-line-soft pt-4">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    {tPublic('resourcesLabel')}
                  </div>
                  <ul className="space-y-3">
                    {resources.map((r) => (
                      <ResourceCard
                        key={r.id}
                        resource={r}
                        typeLabel={tTypes(r.resource_type)}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </article>
          )
        })}
      </div>

      <ShareSection kind="recommendations" recommendationId={snapshot.id} />
    </div>
  )
}

function ResourceCard({
  resource,
  typeLabel,
}: {
  resource: MatchedResource
  typeLabel: string
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="mt-2 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-ink-soft"
      />
      <div className="min-w-0 flex-1">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-ink underline underline-offset-4 transition-colors hover:text-accent-ink"
        >
          {resource.title}
        </a>
        <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-muted">
          {typeLabel}
        </span>
        {resource.description && (
          <p className="mt-1 text-sm text-ink-soft">{resource.description}</p>
        )}
      </div>
    </li>
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
        {refreshing ? <SpinnerIcon /> : <RefreshIcon />}
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
