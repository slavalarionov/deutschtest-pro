'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import { formatEditorialDate } from '@/lib/format/date'
import { ModuleIcon } from '@/components/dashboard/ModuleIcon'
import type {
  HistoryItem,
  HistoryLevel,
  HistoryModule,
} from '@/lib/dashboard/history'

const LEVEL_OPTIONS: HistoryLevel[] = ['A1', 'A2', 'B1']
const MODULE_OPTIONS: HistoryModule[] = ['lesen', 'horen', 'schreiben', 'sprechen']

export function HistoryView() {
  const t = useTranslations('dashboard.history')
  const tModules = useTranslations('modules')
  const locale = useLocale()

  const [items, setItems] = useState<HistoryItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [moduleFilter, setModuleFilter] = useState<HistoryModule | 'all'>('all')
  const [levelFilter, setLevelFilter] = useState<HistoryLevel | 'all'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (moduleFilter !== 'all') params.set('module', moduleFilter)
    if (levelFilter !== 'all') params.set('level', levelFilter)
    if (fromDate) params.set('from', fromDate)
    if (toDate) params.set('to', toDate)
    const qs = params.toString()
    return qs ? `?${qs}` : ''
  }, [moduleFilter, levelFilter, fromDate, toDate])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    fetch(`/api/dashboard/history${queryString}`, { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json()
        if (!active) return
        if (!res.ok || !json.success) {
          setError(json.error || t('errors.loadFailed'))
          setItems([])
          return
        }
        setItems(Array.isArray(json.items) ? json.items : [])
      })
      .catch(() => {
        if (!active) return
        setError(t('errors.network'))
        setItems([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [queryString, t])

  const hasFilters =
    moduleFilter !== 'all' || levelFilter !== 'all' || Boolean(fromDate) || Boolean(toDate)

  function resetFilters() {
    setModuleFilter('all')
    setLevelFilter('all')
    setFromDate('')
    setToDate('')
  }

  const totalCount = items?.length ?? 0

  return (
    <div className="mx-auto max-w-6xl">
      {/* ====== Editorial header ====== */}
      <header>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {t('eyebrow')}
        </div>
        <h1 className="mt-3 font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
          {t('titleCount', { count: totalCount })}
          <br />
          <span className="text-ink-soft">{t('titleSubline')}</span>
        </h1>
      </header>

      {/* ====== Filters card ====== */}
      <div className="mt-10 rounded-rad border border-line bg-surface p-6 sm:p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelectCard label={t('filters.columnsEyebrow.stufe')}>
            <select
              value={levelFilter}
              onChange={(e) =>
                setLevelFilter(e.target.value as HistoryLevel | 'all')
              }
              className="w-full bg-transparent text-sm text-ink outline-none"
            >
              <option value="all">{t('filters.allLevels')}</option>
              {LEVEL_OPTIONS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </FilterSelectCard>

          <FilterSelectCard label={t('filters.columnsEyebrow.modul')}>
            <select
              value={moduleFilter}
              onChange={(e) =>
                setModuleFilter(e.target.value as HistoryModule | 'all')
              }
              className="w-full bg-transparent text-sm text-ink outline-none"
            >
              <option value="all">{t('filters.allModules')}</option>
              {MODULE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {tModules(m)}
                </option>
              ))}
            </select>
          </FilterSelectCard>

          <FilterSelectCard label={t('filters.columnsEyebrow.von')}>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-transparent text-sm text-ink outline-none"
            />
          </FilterSelectCard>

          <FilterSelectCard label={t('filters.columnsEyebrow.bis')}>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-transparent text-sm text-ink outline-none"
            />
          </FilterSelectCard>
        </div>

        {hasFilters && (
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-medium text-ink-soft underline underline-offset-4 transition-colors hover:text-ink"
            >
              {t('filters.reset')}
            </button>
          </div>
        )}
      </div>

      {/* ====== Table card / states ====== */}
      <div className="mt-8">
        {loading && (
          <div className="overflow-hidden rounded-rad border border-line bg-card p-6">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="mb-2 h-12 animate-pulse rounded-rad-sm bg-line"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-rad border border-line bg-accent-soft p-8 text-center">
            <div className="font-mono text-[10px] uppercase tracking-widest text-accent-ink">
              FEHLER
            </div>
            <p className="mt-3 text-sm text-accent-ink">{error}</p>
          </div>
        )}

        {!loading && !error && items && items.length === 0 && (
          <div className="rounded-rad border border-line bg-card p-14 text-center">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {hasFilters ? 'FILTER' : 'KEINE EINTRÄGE'}
            </div>
            <h2 className="mt-3 font-display text-2xl text-ink">
              {hasFilters ? t('empty.withFilters') : t('empty.noAttempts')}
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              {hasFilters
                ? t('empty.withFiltersHint')
                : t('empty.noAttemptsHint')}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-6 inline-flex items-center gap-2 rounded-rad-pill bg-ink px-6 py-3 text-sm font-medium text-page transition-colors hover:bg-ink/90"
              >
                {t('filters.reset')}
              </button>
            ) : (
              <Link
                href="/dashboard"
                className="mt-6 inline-flex items-center gap-2 rounded-rad-pill bg-ink px-6 py-3 text-sm font-medium text-page transition-colors hover:bg-ink/90"
              >
                {t('empty.toDashboard')}
              </Link>
            )}
          </div>
        )}

        {!loading && !error && items && items.length > 0 && (
          <div className="overflow-hidden rounded-rad border border-line bg-card">
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                {/* Header row */}
                <div className="grid grid-cols-10 items-center border-b border-line bg-surface px-6 py-4 font-mono text-[10px] uppercase tracking-widest text-muted">
                  <div className="col-span-2">{t('table.date')}</div>
                  <div className="col-span-3">{t('table.module')}</div>
                  <div className="col-span-1">{t('table.level')}</div>
                  <div className="col-span-2">{t('table.score')}</div>
                  <div className="col-span-2 text-right">{t('table.status')}</div>
                </div>

                {/* Data rows */}
                {items.map((item) => {
                  const passed = item.score >= 60
                  return (
                    <Link
                      key={item.attemptId}
                      href={`/dashboard/test/${item.attemptId}`}
                      className="grid grid-cols-10 items-center border-b border-line px-6 py-5 text-sm transition-colors last:border-0 hover:bg-surface/50"
                    >
                      {/* DATUM */}
                      <div className="col-span-2 font-mono text-sm text-ink-soft">
                        {formatEditorialDate(item.submittedAt, locale)}
                      </div>

                      {/* MODUL */}
                      <div className="col-span-3 flex items-center gap-3">
                        <ModuleIcon
                          module={item.module}
                          className="h-[14px] w-[14px] shrink-0 text-ink"
                        />
                        <span className="font-display text-ink">
                          {tModules(item.module)}
                        </span>
                      </div>

                      {/* NIVEAU */}
                      <div className="col-span-1">
                        <span className="inline-flex items-center rounded-rad-pill border border-line px-2 py-0.5 font-mono text-xs text-ink-soft">
                          {item.level}
                        </span>
                      </div>

                      {/* PUNKTE */}
                      <div className="col-span-2">
                        <div className="flex items-center gap-3">
                          <div className="font-display text-xl text-ink">
                            {item.score}
                          </div>
                          <div className="h-2 w-16 overflow-hidden rounded-rad-pill bg-line">
                            <div
                              className={`h-full rounded-rad-pill ${passed ? 'bg-accent' : 'bg-ink'}`}
                              style={{ width: `${item.score}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* STATUS */}
                      <div className="col-span-2 flex items-center justify-end">
                        <span className="inline-flex items-center gap-2 text-sm">
                          <span
                            aria-hidden="true"
                            className={`block h-1.5 w-1.5 rounded-full ${passed ? 'bg-accent' : 'bg-muted'}`}
                          />
                          <span className={passed ? 'text-ink-soft' : 'text-muted'}>
                            {passed
                              ? t('table.statusBestanden')
                              : t('table.statusNichtBestanden')}
                          </span>
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Editorial filter control — mono caption label sits above a transparent input
 * inside a card with `focus-within:border-ink`. Mirrors the AuthInput pattern.
 */
function FilterSelectCard({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-rad-sm border border-line bg-card px-4 py-3 transition-colors focus-within:border-ink">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </div>
      {children}
    </div>
  )
}
