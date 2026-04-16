'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  ProgressData,
  ProgressModule,
  ProgressPoint,
  Trend,
} from '@/lib/dashboard/progress'

const MODULE_LABELS: Record<ProgressModule, string> = {
  lesen: 'Lesen',
  horen: 'Hören',
  schreiben: 'Schreiben',
  sprechen: 'Sprechen',
}

const MODULE_COLORS: Record<ProgressModule, string> = {
  lesen: '#C8A84B',
  horen: '#3B82F6',
  schreiben: '#10B981',
  sprechen: '#8B5CF6',
}

const MODULES: ProgressModule[] = ['lesen', 'horen', 'schreiben', 'sprechen']

const TREND_LABELS: Record<Trend, { text: string; className: string }> = {
  improving: {
    text: 'Verbessert sich',
    className: 'bg-green-50 text-green-700',
  },
  stable: {
    text: 'Stabil',
    className: 'bg-brand-surface text-brand-muted',
  },
  declining: {
    text: 'Verschlechtert sich',
    className: 'bg-red-50 text-brand-red',
  },
}

function formatDay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
    })
  } catch {
    return '—'
  }
}

interface ChartPoint {
  timestamp: number
  label: string
  lesen?: number
  horen?: number
  schreiben?: number
  sprechen?: number
  all?: number
}

function buildChartData(points: ProgressPoint[]): ChartPoint[] {
  return points.map((p) => ({
    timestamp: new Date(p.submittedAt).getTime(),
    label: formatDay(p.submittedAt),
    all: p.score,
    [p.module]: p.score,
  }))
}

export function ProgressView() {
  const [data, setData] = useState<ProgressData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    fetch('/api/dashboard/progress', { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json()
        if (!active) return
        if (!res.ok || !json.success) {
          setError(json.error || 'Fortschrittsdaten konnten nicht geladen werden.')
          return
        }
        setData(json.data as ProgressData)
      })
      .catch(() => {
        if (!active) return
        setError('Netzwerkfehler beim Laden der Fortschrittsdaten.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const chartData = useMemo(
    () => (data ? buildChartData(data.points) : []),
    [data]
  )

  const activeModules = useMemo(() => {
    if (!data) return [] as ProgressModule[]
    return MODULES.filter((m) =>
      data.moduleAverages.some((avg) => avg.module === m)
    )
  }, [data])

  const showLevelChart = (data?.levelAverages.length ?? 0) >= 2

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Fortschritt</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Graphische Auswertung Ihrer Ergebnisse über die Zeit, nach Modul
          aufgeschlüsselt.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center rounded-2xl bg-brand-white px-6 py-16 shadow-soft">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-gold border-t-transparent" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl bg-brand-white px-6 py-10 text-center shadow-soft">
          <p className="text-sm text-brand-red">{error}</p>
        </div>
      )}

      {!loading && !error && data && data.points.length < 2 && (
        <div className="rounded-2xl bg-brand-white px-6 py-16 text-center shadow-soft">
          <p className="text-sm font-medium text-brand-text">
            Absolvieren Sie mindestens 2 Module, um Ihren Fortschritt zu sehen
          </p>
          <p className="mt-2 text-xs text-brand-muted">
            Bereits absolviert: {data.points.length}
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-lg bg-brand-gold px-5 py-2 text-sm font-semibold text-white hover:bg-brand-gold-dark"
          >
            Zum Dashboard
          </Link>
        </div>
      )}

      {!loading && !error && data && data.points.length >= 2 && (
        <>
          <StatsRow data={data} />

          <ChartCard
            title="Punktzahl über die Zeit"
            subtitle="Alle Module kombiniert, sortiert nach Abschlussdatum."
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E0DDD6" />
                <XAxis
                  dataKey="label"
                  stroke="#6B6560"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="#6B6560"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #E0DDD6',
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${value}`, 'Punkte']}
                />
                <Line
                  type="monotone"
                  dataKey="all"
                  stroke="#1A1A1A"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#C8A84B' }}
                  activeDot={{ r: 6 }}
                  connectNulls
                  name="Punkte"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Aufschlüsselung nach Modul"
            subtitle="Jede Linie folgt den Ergebnissen eines Moduls."
          >
            <ResponsiveContainer width="100%" height={320}>
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E0DDD6" />
                <XAxis
                  dataKey="label"
                  stroke="#6B6560"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="#6B6560"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #E0DDD6',
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {activeModules.map((m) => (
                  <Line
                    key={m}
                    type="monotone"
                    dataKey={m}
                    stroke={MODULE_COLORS[m]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                    name={MODULE_LABELS[m]}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {showLevelChart && (
            <ChartCard
              title="Durchschnitt nach Niveau"
              subtitle="Durchschnittliche Punktzahl über alle Module je Niveau."
            >
              <div className="space-y-3">
                {data.levelAverages.map((lvl) => (
                  <div key={lvl.level} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-brand-text">
                        {lvl.level}
                      </span>
                      <span className="text-brand-muted">
                        {lvl.averageScore} · {lvl.attempts} Modul
                        {lvl.attempts === 1 ? '' : 'e'}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-brand-surface">
                      <div
                        className="h-full bg-brand-gold"
                        style={{ width: `${lvl.averageScore}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}
        </>
      )}
    </div>
  )
}

function StatsRow({ data }: { data: ProgressData }) {
  const trendInfo = TREND_LABELS[data.monthlyTrend.trend]
  const deltaText =
    data.monthlyTrend.delta === null
      ? 'Noch keine Daten aus dem Vormonat'
      : data.monthlyTrend.delta === 0
        ? 'Keine Veränderung'
        : `${data.monthlyTrend.delta > 0 ? '+' : ''}${data.monthlyTrend.delta} Punkte vs. Vormonat`

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <StatCard label="Trend letzter Monat">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${trendInfo.className}`}
          >
            {trendInfo.text}
          </span>
        </div>
        <p className="mt-2 text-xs text-brand-muted">{deltaText}</p>
      </StatCard>

      <StatCard label="Stärkstes Modul">
        {data.strongestModule ? (
          <>
            <p className="text-xl font-bold text-brand-text">
              {MODULE_LABELS[data.strongestModule.module]}
            </p>
            <p className="mt-1 text-xs text-brand-muted">
              Ø {data.strongestModule.averageScore} · {data.strongestModule.attempts} Modul
              {data.strongestModule.attempts === 1 ? '' : 'e'}
            </p>
          </>
        ) : (
          <p className="text-sm text-brand-muted">—</p>
        )}
      </StatCard>

      <StatCard label="Problemmodul">
        {data.weakestModule ? (
          <>
            <p className="text-xl font-bold text-brand-text">
              {MODULE_LABELS[data.weakestModule.module]}
            </p>
            <p className="mt-1 text-xs text-brand-muted">
              Ø {data.weakestModule.averageScore} · {data.weakestModule.attempts} Modul
              {data.weakestModule.attempts === 1 ? '' : 'e'}
            </p>
          </>
        ) : (
          <p className="text-sm text-brand-muted">—</p>
        )}
      </StatCard>
    </div>
  )
}

function StatCard({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl bg-brand-white p-5 shadow-soft">
      <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">
        {label}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl bg-brand-white p-5 shadow-soft">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-brand-text">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-brand-muted">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  )
}
