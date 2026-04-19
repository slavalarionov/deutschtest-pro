'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ProgressData, ProgressModule } from '@/lib/dashboard/progress'
import {
  bucketPointsByWeek,
  computeModuleDeltas,
  type WeeklyBucket,
} from '@/lib/dashboard/progress-client'

const MODULES: ProgressModule[] = ['lesen', 'horen', 'schreiben', 'sprechen']

// Hardcoded German labels — per design spec these are not localised.
const MODULE_LABELS: Record<ProgressModule, string> = {
  lesen: 'LESEN',
  horen: 'HÖREN',
  schreiben: 'SCHREIBEN',
  sprechen: 'SPRECHEN',
}

export function ProgressView() {
  const t = useTranslations('dashboard.progress')
  const [data, setData] = useState<ProgressData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    fetch('/api/dashboard/progress', { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json()
        if (!active) return
        if (!res.ok || !json.success) {
          setError(json.error || t('errors.loadFailed'))
          return
        }
        setData(json.data as ProgressData)
      })
      .catch(() => {
        if (!active) return
        setError(t('errors.network'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [t, reloadToken])

  const weeklyBuckets = useMemo<WeeklyBucket[]>(
    () => (data ? bucketPointsByWeek(data.points, 12) : []),
    [data]
  )

  const moduleDeltas = useMemo(
    () => (data ? computeModuleDeltas(data.points) : null),
    [data]
  )

  const nonNullWeekCount = useMemo(
    () => weeklyBuckets.filter((b) => b.score !== null).length,
    [weeklyBuckets]
  )

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-center rounded-rad border border-line bg-card p-14">
          <div className="h-6 w-6 animate-spin rounded-rad-pill border-2 border-line border-t-ink" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-rad-sm border border-error/20 bg-error-soft p-6">
          <div className="font-mono text-xs uppercase tracking-wider text-error">
            {t('errorV2.title')}
          </div>
          <p className="mt-2 text-sm text-ink-soft">{error}</p>
          <button
            type="button"
            onClick={() => setReloadToken((n) => n + 1)}
            className="mt-4 font-mono text-xs uppercase tracking-wider text-accent-ink underline underline-offset-4 hover:no-underline"
          >
            {t('errorV2.retry')}
          </button>
        </div>
      </div>
    )
  }

  // Hard empty state — fewer than two raw data points.
  if (!data || data.points.length < 2) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-rad border border-line bg-card p-14 text-center">
          <div className="font-mono text-xs uppercase tracking-wider text-muted">
            {t('chart.emptyTitle')}
          </div>
          <h2 className="mt-4 font-display text-5xl tracking-[-0.03em] leading-none text-ink">
            {t('emptyV2.title')}
          </h2>
          <p className="mt-4 text-ink-soft">{t('emptyV2.lead')}</p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center rounded-rad-pill bg-ink px-6 py-3 font-mono text-xs uppercase tracking-wider text-page hover:opacity-90"
          >
            {t('emptyV2.cta')}
          </Link>
        </div>
      </div>
    )
  }

  const delta = data.monthlyTrend.delta
  const currentMonthAvg = data.monthlyTrend.currentMonthAverage

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <Header delta={delta} />

      <WeeklyChart
        buckets={weeklyBuckets}
        hasData={nonNullWeekCount >= 2}
        currentMonthAverage={currentMonthAvg}
      />

      {moduleDeltas && <PerModuleGrid deltas={moduleDeltas} />}

      {data.levelAverages.length >= 2 && <ByLevelBlock levels={data.levelAverages} />}
    </div>
  )
}

function Header({ delta }: { delta: number | null }) {
  const t = useTranslations('dashboard.progress')

  if (delta === null) {
    return (
      <header>
        <div className="font-mono text-xs uppercase tracking-wider text-muted mb-3">
          {t('eyebrow')}
        </div>
        <h1 className="font-display text-6xl md:text-7xl tracking-[-0.035em] leading-[1] text-ink">
          {t('headline.fallbackStrong')}
          <br />
          <span className="text-ink-soft">{t('headline.fallbackMuted')}</span>
        </h1>
      </header>
    )
  }

  const strong =
    delta > 0
      ? t('headline.deltaStrongPositive', { delta })
      : t('headline.deltaStrong', { delta })

  return (
    <header>
      <div className="font-mono text-xs uppercase tracking-wider text-muted mb-3">
        {t('eyebrow')}
      </div>
      <h1 className="font-display text-6xl md:text-7xl tracking-[-0.035em] leading-[1] text-ink">
        {strong}
        <br />
        <span className="text-ink-soft">{t('headline.deltaMuted')}</span>
      </h1>
    </header>
  )
}

interface WeeklyChartProps {
  buckets: WeeklyBucket[]
  hasData: boolean
  currentMonthAverage: number | null
}

function WeeklyChart({ buckets, hasData, currentMonthAverage }: WeeklyChartProps) {
  const t = useTranslations('dashboard.progress')

  if (!hasData) {
    return (
      <section className="rounded-rad border border-line bg-card p-8">
        <div className="font-mono text-xs uppercase tracking-wider text-muted">
          {t('chart.emptyTitle')}
        </div>
        <p className="mt-4 text-ink-soft">{t('chart.emptyLead')}</p>
      </section>
    )
  }

  // Find the last non-null bucket index so we can paint that dot accent.
  let lastIdx = -1
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (buckets[i].score !== null) {
      lastIdx = i
      break
    }
  }

  return (
    <section className="rounded-rad border border-line bg-card p-8">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-muted">
            {t('chart.eyebrow')}
          </div>
          <div className="mt-1 font-display text-5xl md:text-6xl tracking-[-0.025em] leading-none text-ink">
            {currentMonthAverage ?? '—'}
            <span className="text-xl text-muted"> {t('chart.outOf100')}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 font-mono text-xs uppercase tracking-wider text-ink-soft">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-0.5 bg-ink" />
            {t('chart.legendYou')}
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 border-t border-dashed border-muted" />
            {t('chart.legendPassLine')}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={buckets}
          margin={{ top: 10, right: 24, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke="var(--line)" />
          <XAxis
            dataKey="week"
            stroke="var(--muted)"
            tickLine={false}
            axisLine={{ stroke: 'var(--line)' }}
            tick={{
              fontSize: 10,
              fontFamily: 'JetBrains Mono, monospace',
              fill: 'var(--muted)',
            }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            stroke="var(--muted)"
            tickLine={false}
            axisLine={{ stroke: 'var(--line)' }}
            tick={{
              fontSize: 10,
              fontFamily: 'JetBrains Mono, monospace',
              fill: 'var(--muted)',
            }}
          />
          <ReferenceLine
            y={60}
            stroke="var(--muted)"
            strokeDasharray="3 3"
            label={{
              value: t('chart.passLabel'),
              position: 'insideTopRight',
              fontSize: 10,
              fontFamily: 'JetBrains Mono, monospace',
              fill: 'var(--muted)',
            }}
          />
          <Tooltip content={<WeeklyTooltip />} cursor={{ stroke: 'var(--line)' }} />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--ink)"
            strokeWidth={2}
            connectNulls={false}
            dot={(props) => {
              const { cx, cy, index, payload } = props as {
                cx: number
                cy: number
                index: number
                payload: WeeklyBucket
              }
              if (payload.score === null) {
                return <g key={`empty-${index}`} />
              }
              const isLast = index === lastIdx
              return (
                <circle
                  key={`dot-${index}`}
                  cx={cx}
                  cy={cy}
                  r={isLast ? 5 : 3}
                  fill={isLast ? 'var(--accent)' : 'var(--ink)'}
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              )
            }}
            activeDot={{
              r: 6,
              fill: 'var(--accent)',
              stroke: 'var(--card)',
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  )
}

interface TooltipPayloadItem {
  value: number | null
  payload: WeeklyBucket
}

function WeeklyTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
}) {
  const t = useTranslations('dashboard.progress')
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0]
  if (!item || item.value === null || item.value === undefined) return null
  return (
    <div className="rounded-rad-sm border border-line bg-card p-3 shadow-lift">
      <div className="font-mono text-xs uppercase tracking-wider text-muted">
        {item.payload.week}
      </div>
      <div className="mt-1 font-display text-2xl tracking-[-0.025em] leading-none text-ink">
        {item.value}
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">
        {t('tooltip.scoreLabel')}
      </div>
    </div>
  )
}

function PerModuleGrid({
  deltas,
}: {
  deltas: Record<ProgressModule, { current: number | null; previous: number | null; delta: number | null }>
}) {
  const t = useTranslations('dashboard.progress')

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {MODULES.map((m) => {
        const d = deltas[m]
        const cur = d.current
        const prev = d.previous
        const deltaVal = d.delta

        const deltaChip =
          deltaVal === null
            ? t('perModule.noDeltaPlaceholder')
            : deltaVal > 0
              ? `+${deltaVal}`
              : `${deltaVal}`
        const deltaClass =
          deltaVal === null
            ? 'text-muted'
            : deltaVal > 0
              ? 'text-accent-ink'
              : deltaVal < 0
                ? 'text-muted'
                : 'text-muted'

        const barWidth = cur ?? 0
        const barFill = cur !== null && cur >= 60 ? 'bg-accent' : 'bg-ink'

        return (
          <div
            key={m}
            className="rounded-rad border border-line bg-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs uppercase tracking-wider text-muted">
                {MODULE_LABELS[m]}
              </span>
              <span className={`font-mono text-xs ${deltaClass}`}>
                {deltaChip}
              </span>
            </div>
            <div className="font-display text-5xl tracking-[-0.03em] leading-none text-ink">
              {cur ?? '—'}
            </div>
            <div className="mt-1 font-mono text-xs text-muted">
              {prev === null
                ? t('perModule.noPrev')
                : t('perModule.previousLabel', { prev })}
            </div>
            <div className="mt-4 h-2 w-full bg-line rounded-rad-pill overflow-hidden">
              {cur !== null && (
                <div
                  className={`h-full ${barFill}`}
                  style={{ width: `${barWidth}%` }}
                />
              )}
            </div>
          </div>
        )
      })}
    </section>
  )
}

function ByLevelBlock({
  levels,
}: {
  levels: { level: string; averageScore: number; attempts: number }[]
}) {
  const t = useTranslations('dashboard.progress')

  return (
    <section className="rounded-rad border border-line bg-card p-8">
      <div className="font-mono text-xs uppercase tracking-wider text-muted mb-6">
        {t('byLevelV2.eyebrow')}
      </div>
      <div className="space-y-4">
        {levels.map((lvl) => (
          <div key={lvl.level} className="flex items-center gap-4">
            <div className="w-12 font-mono text-xs uppercase tracking-wider text-ink">
              {lvl.level}
            </div>
            <div className="flex-1 h-2 bg-line rounded-rad-pill overflow-hidden">
              <div
                className={`h-full ${lvl.averageScore >= 60 ? 'bg-accent' : 'bg-ink'}`}
                style={{ width: `${lvl.averageScore}%` }}
              />
            </div>
            <div className="w-12 text-right font-mono text-sm text-ink">
              {lvl.averageScore}
            </div>
            <div className="font-mono text-xs text-muted whitespace-nowrap">
              {t('byLevelV2.attempts', { attempts: lvl.attempts })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
