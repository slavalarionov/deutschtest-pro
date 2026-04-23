'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export interface FeedbackRow {
  id: number
  userId: string | null
  email: string | null
  level: string | null
  module: string | null
  rating: number | null
  message: string | null
  createdAt: string | null
}

export interface FeedbackFilters {
  rating: 'all' | 'low' | 'mid' | 'high'
  level: 'all' | 'A1' | 'A2' | 'B1'
  module: 'all' | 'lesen' | 'horen' | 'schreiben' | 'sprechen'
  period: 'all' | 'today' | '7d' | '30d'
  page: number
}

const MODULE_LABELS: Record<'lesen' | 'horen' | 'schreiben' | 'sprechen', string> = {
  lesen: 'Lesen',
  horen: 'Hören',
  schreiben: 'Schreiben',
  sprechen: 'Sprechen',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function RatingStars({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="font-mono text-xs text-muted">—</span>
  }
  return (
    <span
      className="font-mono text-sm tabular-nums"
      aria-label={`Rating ${value} из 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? 'text-ink' : 'text-muted'}>
          {n <= value ? '•' : '·'}
        </span>
      ))}
    </span>
  )
}

function MessageCell({ text }: { text: string | null }) {
  const [expanded, setExpanded] = useState(false)
  if (!text || text.trim().length === 0) {
    return <span className="text-muted">—</span>
  }
  const needsTruncate = text.length > 140
  if (!needsTruncate) {
    return <span className="whitespace-pre-wrap text-ink">{text}</span>
  }
  return (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      className="text-left text-ink transition-colors hover:text-ink-soft"
    >
      <span
        className={expanded ? 'whitespace-pre-wrap' : 'line-clamp-2 whitespace-pre-wrap'}
      >
        {text}
      </span>
      <span className="mt-1 block font-mono text-[10px] uppercase tracking-widest text-muted">
        {expanded ? 'Свернуть' : 'Показать полностью'}
      </span>
    </button>
  )
}

export function FeedbackList({
  rows,
  totalMatching,
  filters,
  pageSize,
}: {
  rows: FeedbackRow[]
  totalMatching: number
  filters: FeedbackFilters
  pageSize: number
}) {
  const router = useRouter()

  function pushFilters(next: Partial<FeedbackFilters>) {
    const merged = { ...filters, ...next }
    const params = new URLSearchParams()
    if (merged.rating !== 'all') params.set('rating', merged.rating)
    if (merged.level !== 'all') params.set('level', merged.level)
    if (merged.module !== 'all') params.set('module', merged.module)
    if (merged.period !== 'all') params.set('period', merged.period)
    if (merged.page > 1) params.set('page', String(merged.page))
    const qs = params.toString()
    router.push(`/admin/feedback${qs ? `?${qs}` : ''}`)
  }

  const totalPages = Math.max(1, Math.ceil(totalMatching / pageSize))
  const canPrev = filters.page > 1
  const canNext = filters.page < totalPages

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-rad border border-line bg-surface p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterCard label="Rating">
            <FilterSelect
              value={filters.rating}
              onChange={(v) =>
                pushFilters({ rating: v as FeedbackFilters['rating'], page: 1 })
              }
              options={[
                { value: 'all', label: 'Все' },
                { value: 'high', label: '4-5 (высокий)' },
                { value: 'mid', label: '3 (средний)' },
                { value: 'low', label: '1-2 (низкий)' },
              ]}
            />
          </FilterCard>
          <FilterCard label="Уровень">
            <FilterSelect
              value={filters.level}
              onChange={(v) =>
                pushFilters({ level: v as FeedbackFilters['level'], page: 1 })
              }
              options={[
                { value: 'all', label: 'Все' },
                { value: 'A1', label: 'A1' },
                { value: 'A2', label: 'A2' },
                { value: 'B1', label: 'B1' },
              ]}
            />
          </FilterCard>
          <FilterCard label="Модуль">
            <FilterSelect
              value={filters.module}
              onChange={(v) =>
                pushFilters({ module: v as FeedbackFilters['module'], page: 1 })
              }
              options={[
                { value: 'all', label: 'Все' },
                { value: 'lesen', label: 'Lesen' },
                { value: 'horen', label: 'Hören' },
                { value: 'schreiben', label: 'Schreiben' },
                { value: 'sprechen', label: 'Sprechen' },
              ]}
            />
          </FilterCard>
          <FilterCard label="Период">
            <FilterSelect
              value={filters.period}
              onChange={(v) =>
                pushFilters({ period: v as FeedbackFilters['period'], page: 1 })
              }
              options={[
                { value: 'all', label: 'Всё время' },
                { value: 'today', label: 'Сегодня' },
                { value: '7d', label: 'Последние 7 д' },
                { value: '30d', label: 'Последние 30 д' },
              ]}
            />
          </FilterCard>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-rad border border-line bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="border-b border-line bg-surface">
              <tr className="font-mono text-[10px] uppercase tracking-widest text-muted">
                <th className="px-4 py-3 text-left font-normal">Дата</th>
                <th className="px-4 py-3 text-left font-normal">Email</th>
                <th className="px-4 py-3 text-left font-normal">Уровень · Модуль</th>
                <th className="px-4 py-3 text-left font-normal">Rating</th>
                <th className="px-4 py-3 text-left font-normal">Сообщение</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-16 text-center font-mono text-xs text-muted"
                  >
                    Отзывов пока нет.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const moduleLabel =
                    r.module && r.module in MODULE_LABELS
                      ? MODULE_LABELS[r.module as keyof typeof MODULE_LABELS]
                      : r.module ?? '—'
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-line-soft transition-colors last:border-0 hover:bg-surface/50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums text-muted">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink">
                        {r.userId && r.email ? (
                          <Link
                            href={`/admin/users/${r.userId}`}
                            className="underline underline-offset-4 hover:text-ink-soft"
                          >
                            {r.email}
                          </Link>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums text-ink-soft">
                        {r.level ?? '—'} <span className="text-muted">·</span>{' '}
                        {moduleLabel}
                      </td>
                      <td className="px-4 py-3">
                        <RatingStars value={r.rating} />
                      </td>
                      <td className="max-w-xl px-4 py-3 text-sm">
                        <MessageCell text={r.message} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between font-mono text-xs tabular-nums text-muted">
        <div>
          Страница {filters.page} из {totalPages} · Всего: {totalMatching}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => canPrev && pushFilters({ page: filters.page - 1 })}
            disabled={!canPrev}
            className="inline-flex items-center rounded-rad-pill border border-line px-3 py-1.5 uppercase tracking-wider text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            Назад
          </button>
          <button
            onClick={() => canNext && pushFilters({ page: filters.page + 1 })}
            disabled={!canNext}
            className="inline-flex items-center rounded-rad-pill border border-line px-3 py-1.5 uppercase tracking-wider text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            Вперёд
          </button>
        </div>
      </div>
    </div>
  )
}

function FilterCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-rad-sm border border-line bg-card px-3 py-2 transition-colors focus-within:border-ink">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </div>
      {children}
    </div>
  )
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent text-sm text-ink focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
