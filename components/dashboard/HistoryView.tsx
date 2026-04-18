'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import type {
  HistoryItem,
  HistoryLevel,
  HistoryModule,
} from '@/lib/dashboard/history'

const LEVEL_OPTIONS: HistoryLevel[] = ['A1', 'A2', 'B1']
const MODULE_OPTIONS: HistoryModule[] = ['lesen', 'horen', 'schreiben', 'sprechen']

function formatDate(iso: string): string {
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

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75
      ? 'bg-green-50 text-green-700'
      : score >= 60
        ? 'bg-brand-gold/10 text-brand-gold-dark'
        : 'bg-red-50 text-brand-red'
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${color}`}
    >
      {score}
    </span>
  )
}

function StatusBadge({
  isFreeTest,
  label,
}: {
  isFreeTest: boolean
  label: string
}) {
  if (isFreeTest) {
    return (
      <span className="inline-flex items-center rounded-md bg-brand-surface px-2 py-0.5 text-xs font-medium text-brand-muted">
        {label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-md bg-brand-gold/10 px-2 py-0.5 text-xs font-medium text-brand-gold-dark">
      {label}
    </span>
  )
}

export function HistoryView() {
  const t = useTranslations('dashboard.history')
  const tModules = useTranslations('modules')
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
    moduleFilter !== 'all' || levelFilter !== 'all' || fromDate || toDate

  function resetFilters() {
    setModuleFilter('all')
    setLevelFilter('all')
    setFromDate('')
    setToDate('')
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">{t('title')}</h1>
        <p className="mt-1 text-sm text-brand-muted">{t('subtitle')}</p>
      </div>

      <div className="rounded-2xl bg-brand-white p-5 shadow-soft">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-brand-muted">
              {t('filters.level')}
            </label>
            <select
              value={levelFilter}
              onChange={(e) =>
                setLevelFilter(e.target.value as HistoryLevel | 'all')
              }
              className="w-full rounded-lg border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-text focus:border-brand-gold focus:outline-none"
            >
              <option value="all">{t('filters.allLevels')}</option>
              {LEVEL_OPTIONS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-brand-muted">
              {t('filters.module')}
            </label>
            <select
              value={moduleFilter}
              onChange={(e) =>
                setModuleFilter(e.target.value as HistoryModule | 'all')
              }
              className="w-full rounded-lg border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-text focus:border-brand-gold focus:outline-none"
            >
              <option value="all">{t('filters.allModules')}</option>
              {MODULE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {tModules(m)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-brand-muted">
              {t('filters.dateFrom')}
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-text focus:border-brand-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-brand-muted">
              {t('filters.dateTo')}
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-lg border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-text focus:border-brand-gold focus:outline-none"
            />
          </div>
        </div>

        {hasFilters && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-medium text-brand-muted hover:text-brand-text"
            >
              {t('filters.reset')}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-brand-white shadow-soft">
        {loading && (
          <div className="flex items-center justify-center px-6 py-16">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-gold border-t-transparent" />
          </div>
        )}

        {!loading && error && (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-brand-red">{error}</p>
          </div>
        )}

        {!loading && !error && items && items.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-brand-text">
              {hasFilters ? t('empty.withFilters') : t('empty.noAttempts')}
            </p>
            <p className="mt-2 text-xs text-brand-muted">
              {hasFilters
                ? t('empty.withFiltersHint')
                : t('empty.noAttemptsHint')}
            </p>
            {!hasFilters && (
              <Link
                href="/dashboard"
                className="mt-6 inline-block rounded-lg bg-brand-gold px-5 py-2 text-sm font-semibold text-white hover:bg-brand-gold-dark"
              >
                {t('empty.toDashboard')}
              </Link>
            )}
          </div>
        )}

        {!loading && !error && items && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-brand-border bg-brand-surface/50 text-left text-xs uppercase tracking-wider text-brand-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">{t('table.date')}</th>
                  <th className="px-4 py-3 font-medium">{t('table.level')}</th>
                  <th className="px-4 py-3 font-medium">{t('table.module')}</th>
                  <th className="px-4 py-3 font-medium">{t('table.score')}</th>
                  <th className="px-4 py-3 font-medium">{t('table.status')}</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {items.map((item) => (
                  <tr
                    key={item.attemptId}
                    className="transition-colors hover:bg-brand-surface/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-brand-text">
                      {formatDate(item.submittedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-brand-bg px-2 py-0.5 text-xs font-semibold text-brand-text">
                        {item.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-brand-text">
                      {tModules(item.module)}
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={item.score} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        isFreeTest={item.isFreeTest}
                        label={
                          item.isFreeTest
                            ? t('status.free')
                            : t('status.paid')
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/test/${item.attemptId}`}
                        className="text-xs font-semibold text-brand-gold-dark hover:underline"
                      >
                        {t('table.detailsLink')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
