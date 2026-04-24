'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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
import type { ProgressData, ProgressLevel, ProgressModule } from '@/lib/dashboard/progress'
import {
  bucketPointsByWeekPerModule,
  computeModuleDeltas,
  countAttemptsByLevel,
  countAttemptsByModuleForLevel,
  type PerModuleWeeklyBucket,
} from '@/lib/dashboard/progress-client'

const MODULES: ProgressModule[] = ['lesen', 'horen', 'schreiben', 'sprechen']
const LEVELS: ProgressLevel[] = ['A1', 'A2', 'B1']

// Hardcoded German labels — per design spec these are not localised.
const MODULE_LABELS: Record<ProgressModule, string> = {
  lesen: 'LESEN',
  horen: 'HÖREN',
  schreiben: 'SCHREIBEN',
  sprechen: 'SPRECHEN',
}

const MODULE_STROKES: Record<ProgressModule, string> = {
  lesen: 'var(--ink)',
  horen: 'var(--accent)',
  schreiben: 'var(--ink-soft)',
  sprechen: 'var(--muted)',
}

function parseLevelParam(raw: string | null): ProgressLevel | null {
  if (!raw) return null
  const upper = raw.toUpperCase()
  return (LEVELS as string[]).includes(upper) ? (upper as ProgressLevel) : null
}

function pickDefaultLevel(points: ProgressData['points']): ProgressLevel {
  const counts = countAttemptsByLevel(points)
  let best: ProgressLevel = 'A1'
  let bestCount = counts.A1
  for (const lvl of LEVELS) {
    if (counts[lvl] > bestCount) {
      best = lvl
      bestCount = counts[lvl]
    }
  }
  return best
}

export function ProgressView() {
  const t = useTranslations('dashboard.progress')
  const searchParams = useSearchParams()
  const [data, setData] = useState<ProgressData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedLevel, setSelectedLevel] = useState<ProgressLevel | null>(null)

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

  // Resolve initial level: ?level= query wins; otherwise the level with the
  // most attempts; otherwise A1. Only commit once per data load so URL param
  // is not overwritten on re-renders.
  useEffect(() => {
    if (!data || selectedLevel !== null) return
    const fromQuery = parseLevelParam(searchParams.get('level'))
    setSelectedLevel(fromQuery ?? pickDefaultLevel(data.points))
  }, [data, searchParams, selectedLevel])

  const handleLevelChange = (level: ProgressLevel) => {
    setSelectedLevel(level)
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    url.searchParams.set('level', level.toLowerCase())
    window.history.replaceState(null, '', url.toString())
  }

  const moduleDeltas = useMemo(
    () => (data ? computeModuleDeltas(data.points) : null),
    [data]
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
            {t('error.title')}
          </div>
          <p className="mt-2 text-sm text-ink-soft">{error}</p>
          <button
            type="button"
            onClick={() => setReloadToken((n) => n + 1)}
            className="mt-4 font-mono text-xs uppercase tracking-wider text-accent-ink underline underline-offset-4 hover:no-underline"
          >
            {t('error.retry')}
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
            {t('empty.title')}
          </h2>
          <p className="mt-4 text-ink-soft">{t('empty.lead')}</p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center rounded-rad-pill bg-ink px-6 py-3 font-mono text-xs uppercase tracking-wider text-page hover:opacity-90"
          >
            {t('empty.cta')}
          </Link>
        </div>
      </div>
    )
  }

  const delta = data.monthlyTrend.delta
  const level = selectedLevel ?? pickDefaultLevel(data.points)

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <Header delta={delta} />

      <ModuleLinesChart
        points={data.points}
        selectedLevel={level}
        onLevelChange={handleLevelChange}
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

interface ModuleLinesChartProps {
  points: ProgressData['points']
  selectedLevel: ProgressLevel
  onLevelChange: (level: ProgressLevel) => void
}

function ModuleLinesChart({
  points,
  selectedLevel,
  onLevelChange,
}: ModuleLinesChartProps) {
  const t = useTranslations('dashboard.progress')

  const buckets = useMemo<PerModuleWeeklyBucket[]>(
    () => bucketPointsByWeekPerModule(points, selectedLevel, 12),
    [points, selectedLevel]
  )

  const attemptsByModule = useMemo(
    () => countAttemptsByModuleForLevel(points, selectedLevel),
    [points, selectedLevel]
  )

  const totalOnLevel =
    attemptsByModule.lesen +
    attemptsByModule.horen +
    attemptsByModule.schreiben +
    attemptsByModule.sprechen

  const [hoveredLine, setHoveredLine] = useState<ProgressModule | null>(null)
  const [hiddenLines, setHiddenLines] = useState<Set<ProgressModule>>(
    () => new Set()
  )

  const toggleHidden = (m: ProgressModule) => {
    setHiddenLines((prev) => {
      const next = new Set(prev)
      if (next.has(m)) next.delete(m)
      else next.add(m)
      return next
    })
  }

  return (
    <section className="rounded-rad border border-line bg-card p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-muted">
            {t('chart.eyebrow')}
          </div>
          <h2 className="mt-1 font-display text-3xl md:text-4xl tracking-[-0.025em] leading-none text-ink">
            {t('chart.moduleHeadline')}
          </h2>
        </div>
        <LevelToggle selected={selectedLevel} onChange={onLevelChange} />
      </div>

      {totalOnLevel === 0 ? (
        <EmptyStateForLevel level={selectedLevel} />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              key={selectedLevel}
              data={buckets}
              margin={{ top: 10, right: 24, left: 0, bottom: 0 }}
              onMouseLeave={() => setHoveredLine(null)}
            >
              <CartesianGrid strokeDasharray="2 4" stroke="var(--line-soft)" />
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
              <Tooltip
                content={
                  <MultiTooltip
                    hoveredLine={hoveredLine}
                    hiddenLines={hiddenLines}
                  />
                }
                cursor={{ stroke: 'var(--line)' }}
              />
              {MODULES.map((m) => {
                if (hiddenLines.has(m)) return null
                const isHovered = hoveredLine === m
                const isDimmed = hoveredLine !== null && !isHovered
                return (
                  <Line
                    key={m}
                    type="monotone"
                    dataKey={m}
                    stroke={MODULE_STROKES[m]}
                    strokeWidth={isHovered ? 3 : 2}
                    strokeOpacity={isDimmed ? 0.2 : 1}
                    connectNulls={false}
                    isAnimationActive={true}
                    animationDuration={1000}
                    animationEasing="ease-in-out"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: MODULE_STROKES[m],
                      stroke: 'var(--card)',
                      strokeWidth: 2,
                      onMouseEnter: () => setHoveredLine(m),
                    }}
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>

          <ChartLegend
            attempts={attemptsByModule}
            hiddenLines={hiddenLines}
            hoveredLine={hoveredLine}
            onToggle={toggleHidden}
            onHover={setHoveredLine}
          />
        </>
      )}
    </section>
  )
}

function LevelToggle({
  selected,
  onChange,
}: {
  selected: ProgressLevel
  onChange: (level: ProgressLevel) => void
}) {
  const t = useTranslations('dashboard.progress')
  return (
    <div
      role="tablist"
      aria-label={t('chart.levelToggle.aria')}
      className="inline-flex items-center rounded-rad-pill border border-line bg-page p-1"
    >
      {LEVELS.map((lvl) => {
        const isActive = lvl === selected
        return (
          <button
            key={lvl}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(lvl)}
            className={`rounded-rad-pill px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors ${
              isActive
                ? 'bg-ink text-card'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            {lvl}
          </button>
        )
      })}
    </div>
  )
}

function EmptyStateForLevel({ level }: { level: ProgressLevel }) {
  const t = useTranslations('dashboard.progress')
  return (
    <div className="rounded-rad-sm border border-dashed border-line p-10 text-center">
      <div className="font-mono text-xs uppercase tracking-wider text-muted">
        {t('chart.emptyTitle')}
      </div>
      <p className="mt-4 text-ink-soft">
        {t('chart.emptyStateForLevel', { level })}
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center rounded-rad-pill bg-ink px-5 py-2.5 font-mono text-xs uppercase tracking-wider text-page hover:opacity-90"
      >
        {t('chart.emptyStateCta')}
      </Link>
    </div>
  )
}

interface TooltipPayloadItem {
  dataKey?: string
  value?: number | null
  payload?: PerModuleWeeklyBucket
}

function MultiTooltip({
  active,
  payload,
  hoveredLine,
  hiddenLines,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  hoveredLine: ProgressModule | null
  hiddenLines: Set<ProgressModule>
}) {
  const t = useTranslations('dashboard.progress')
  if (!active || !payload || payload.length === 0) return null
  const bucket = payload[0]?.payload
  if (!bucket) return null

  const countField: Record<ProgressModule, keyof PerModuleWeeklyBucket> = {
    lesen: 'lesenCount',
    horen: 'horenCount',
    schreiben: 'schreibenCount',
    sprechen: 'sprechenCount',
  }

  return (
    <div className="rounded-rad border border-line bg-card px-3 py-2 shadow-lift">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
        {bucket.week}
      </div>
      <ul className="mt-1 space-y-0.5">
        {MODULES.map((m) => {
          const isHidden = hiddenLines.has(m)
          const value = bucket[m] as number | null
          const count = bucket[countField[m]] as number
          const isActive = hoveredLine === m
          const toneClass = isHidden
            ? 'text-muted opacity-50'
            : isActive
              ? 'text-ink'
              : hoveredLine !== null
                ? 'text-muted'
                : 'text-ink'
          return (
            <li
              key={m}
              className={`flex items-baseline gap-2 font-mono text-xs tabular-nums ${toneClass}`}
            >
              <span
                aria-hidden="true"
                className="block h-2 w-2 rounded-full"
                style={{ background: MODULE_STROKES[m] }}
              />
              <span className="flex-1">{MODULE_LABELS[m]}</span>
              <span>
                {value === null ? '—' : value}
                {value !== null && count > 0 && (
                  <span className="ml-2 text-muted">
                    · {t('chart.tooltip.attempts', { count })}
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ChartLegend({
  attempts,
  hiddenLines,
  hoveredLine,
  onToggle,
  onHover,
}: {
  attempts: Record<ProgressModule, number>
  hiddenLines: Set<ProgressModule>
  hoveredLine: ProgressModule | null
  onToggle: (m: ProgressModule) => void
  onHover: (m: ProgressModule | null) => void
}) {
  const t = useTranslations('dashboard.progress')
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-6">
      {MODULES.map((m) => {
        const isHidden = hiddenLines.has(m)
        const count = attempts[m]
        const isActive = hoveredLine === m
        return (
          <button
            key={m}
            type="button"
            aria-pressed={!isHidden}
            onClick={() => onToggle(m)}
            onMouseEnter={() => onHover(m)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(m)}
            onBlur={() => onHover(null)}
            className={`inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider transition-colors ${
              isHidden
                ? 'text-muted line-through opacity-60'
                : isActive
                  ? 'text-ink'
                  : 'text-ink-soft hover:text-ink'
            }`}
          >
            <span
              aria-hidden="true"
              className="block h-3 w-3 rounded-full"
              style={{
                background: MODULE_STROKES[m],
                opacity: isHidden ? 0.4 : 1,
              }}
            />
            <span>{MODULE_LABELS[m]}</span>
            <span className="text-muted">· {count}</span>
          </button>
        )
      })}
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
        {t('byLevel.eyebrow')}
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
              {t('byLevel.attempts', { attempts: lvl.attempts })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
