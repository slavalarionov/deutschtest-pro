import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase-server'
import { loadDashboardStats, type DashboardModule } from '@/lib/dashboard/stats'
import { loadUserHistory, type HistoryItem } from '@/lib/dashboard/history'
import { loadProgressData, type ProgressPoint } from '@/lib/dashboard/progress'
import { ModuleLauncher } from '@/components/dashboard/ModuleLauncher'

export const dynamic = 'force-dynamic'

/**
 * Format "18. Apr · 14:32" (de-DE, day+short-month + HH:mm).
 * Used for the Verlauf preview rows to match the Phase 3 prototype.
 */
function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    const day = d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
    const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    return `${day} · ${time}`
  } catch {
    return '—'
  }
}

/** Capitalize first letter of the email handle as a friendly fallback for the greeting. */
function humanizeHandle(handle: string): string {
  if (!handle) return ''
  return handle.charAt(0).toUpperCase() + handle.slice(1)
}

/**
 * Render the 12-point sparkline in the Overview chart preview.
 * Mirrors the prototype (docs/Redesign.html:777-790): padded viewBox, dashed
 * baseline at score 60 ("pass"), ink-stroked polyline, hollow points, and an
 * accent badge on the last point with the current average.
 */
function ProgressSparkline({
  points,
  label,
}: {
  points: ProgressPoint[]
  label: string
}) {
  const scores = points.map((p) => p.score)
  const width = 560
  const height = 160
  const pad = 20
  const max = 100

  const sx = (i: number) =>
    pad + (i * (width - pad * 2)) / Math.max(scores.length - 1, 1)
  const sy = (v: number) => height - pad - (v / max) * (height - pad * 2)
  const path = scores.map((p, i) => `${i ? 'L' : 'M'}${sx(i)},${sy(p)}`).join(' ')

  const lastScore = scores[scores.length - 1]
  const badgeX = sx(scores.length - 1) - 22
  const badgeY = sy(lastScore) - 30

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      className="h-[180px] text-ink"
      aria-label={label}
    >
      {/* baseline at 60 = pass threshold */}
      <line
        x1={pad}
        x2={width - pad}
        y1={sy(60)}
        y2={sy(60)}
        className="stroke-line"
        strokeDasharray="3 4"
      />
      <text
        x={pad}
        y={sy(60) - 4}
        fontSize="9"
        className="fill-muted font-mono"
      >
        60 — pass
      </text>

      {/* Score polyline */}
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" />

      {/* Hollow markers on each point */}
      {scores.map((p, i) => (
        <circle
          key={i}
          cx={sx(i)}
          cy={sy(p)}
          r="3"
          className="fill-page stroke-ink"
          strokeWidth="1.5"
        />
      ))}

      {/* Accent badge on the last point with average */}
      <g transform={`translate(${badgeX},${badgeY})`}>
        <rect
          width="56"
          height="22"
          rx="11"
          className="fill-accent"
        />
        <text
          x="28"
          y="14"
          textAnchor="middle"
          fontSize="11"
          fill="#fff"
          fontWeight="600"
        >
          {lastScore} Ø
        </text>
      </g>
    </svg>
  )
}

export default async function DashboardHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Layout guarantees `user` exists, but TS doesn't know that.
  if (!user) return null

  const serverDb = createServerClient()

  const [stats, profileRes, history, progress, t, tModules] = await Promise.all([
    loadDashboardStats(user.id),
    serverDb
      .from('profiles')
      .select('is_admin, display_name, cached_recommendations')
      .eq('id', user.id)
      .maybeSingle(),
    loadUserHistory(user.id),
    loadProgressData(user.id),
    getTranslations('dashboard.overview'),
    getTranslations('modules'),
  ])

  const isAdmin = profileRes.data?.is_admin === true
  const displayName =
    typeof profileRes.data?.display_name === 'string' && profileRes.data.display_name.trim()
      ? profileRes.data.display_name.trim()
      : humanizeHandle((user.email ?? '').split('@')[0] ?? '')

  const moduleLabels: Record<DashboardModule, string> = {
    lesen: tModules('lesen'),
    horen: tModules('horen'),
    schreiben: tModules('schreiben'),
    sprechen: tModules('sprechen'),
  }

  // Preview slices — lib loaders stay untouched; we slice here.
  const recentHistory: HistoryItem[] = history.slice(0, 5)
  const sparklinePoints = progress.points.slice(-12)

  // Derive the top-2 study-plan items from cached recommendations. We read
  // the cache directly and never trigger Claude — the Overview is a cheap
  // summary surface. Full generation lives on /dashboard/recommendations.
  const cachedRecs = profileRes.data?.cached_recommendations as
    | { studyPlan?: Array<{ title: string; description: string }> }
    | null
    | undefined
  const topRecs: Array<{ title: string; description: string }> = Array.isArray(
    cachedRecs?.studyPlan
  )
    ? cachedRecs!.studyPlan!.slice(0, 2)
    : []

  const hasAttempts = stats.totalModules > 0

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ====== Greeting ====== */}
      <header>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {t('eyebrow')}
        </div>
        <h1 className="mt-3 font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
          {t.rich('greeting', {
            name: () => (
              <span className="font-display-tight font-normal italic">
                {displayName}
              </span>
            ),
          })}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-ink-soft">
          {hasAttempts
            ? t('leadWithAttempts', {
                total: stats.totalModules,
                avg: stats.averageScore ?? 0,
              })
            : t('leadEmpty')}
        </p>
      </header>

      {/* ====== Module launcher ====== */}
      <ModuleLauncher modulesBalance={stats.modulesBalance} isAdmin={isAdmin} />

      <div className="border-t border-line" />

      {/* ====== Stat row ====== */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('stats.absolviert')}
          value={String(stats.totalModules)}
        />
        <StatCard
          label={t('stats.durchschnitt')}
          value={stats.averageScore !== null ? String(stats.averageScore) : '—'}
          suffix={stats.averageScore !== null ? '/ 100' : undefined}
        />
        <StatCard
          label={t('stats.bestesErgebnis')}
          value={stats.bestScore !== null ? String(stats.bestScore) : '—'}
          suffix={stats.bestScore !== null ? '/ 100' : undefined}
        />
        <StatCard
          label={t('stats.balance')}
          value={isAdmin ? '∞' : String(stats.modulesBalance)}
        />
      </div>

      {/* ====== Chart preview + KI-Empfehlungen ====== */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        {/* Chart preview */}
        <section className="rounded-rad-sm border border-line bg-card p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-ink">
              {t('chartPreviewTitle')}
            </h2>
          </div>
          {sparklinePoints.length > 0 ? (
            <ProgressSparkline
              points={sparklinePoints}
              label={t('chartPreviewTitle')}
            />
          ) : (
            <div className="flex h-[180px] flex-col items-start justify-center">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {t('eyebrow')}
              </div>
              <p className="mt-2 text-sm text-ink-soft">{t('chartEmpty')}</p>
            </div>
          )}
        </section>

        {/* Recommendations preview */}
        <section className="rounded-rad-sm border border-line bg-card p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-medium text-ink">
            {t('recommendationsPreviewTitle')}
          </h2>
          {topRecs.length > 0 ? (
            <>
              <ul className="space-y-4">
                {topRecs.map((rec, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      className={`mt-1.5 block h-2 w-2 shrink-0 rounded-full ${
                        i === 0 ? 'bg-accent' : 'bg-ink'
                      }`}
                      aria-hidden="true"
                    />
                    <div>
                      <div className="text-sm font-medium text-ink">
                        {rec.title}
                      </div>
                      <div className="mt-0.5 text-xs text-ink-soft">
                        {rec.description}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <a
                href="/dashboard/recommendations"
                className="mt-5 inline-flex items-center gap-1 text-xs text-ink-soft transition-colors hover:text-ink"
              >
                {t('recommendationsAll')}
              </a>
            </>
          ) : (
            <p className="text-sm text-ink-soft">{t('recommendationsEmpty')}</p>
          )}
        </section>
      </div>

      {/* ====== Verlauf table preview ====== */}
      <section className="overflow-hidden rounded-rad-sm border border-line bg-card">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-sm font-medium text-ink">
            {t('historyPreviewTitle')}
          </h2>
          <a
            href="/dashboard/history"
            className="inline-flex items-center gap-1 text-xs text-ink-soft transition-colors hover:text-ink"
          >
            {t('historyPreviewAll')}
          </a>
        </div>

        {recentHistory.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-ink-soft">{t('historyEmpty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Column labels */}
            <div className="grid min-w-[640px] grid-cols-12 border-b border-line-soft px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-muted">
              <div className="col-span-3">{t('tableCols.datum')}</div>
              <div className="col-span-3">{t('tableCols.modul')}</div>
              <div className="col-span-2">{t('tableCols.niveau')}</div>
              <div className="col-span-2">{t('tableCols.punktzahl')}</div>
              <div className="col-span-2">{t('tableCols.status')}</div>
            </div>

            {recentHistory.map((row, i) => {
              const passed = row.score >= 60
              return (
                <div
                  key={row.attemptId}
                  className={`grid min-w-[640px] grid-cols-12 items-center px-5 py-4 text-sm ${
                    i < recentHistory.length - 1 ? 'border-b border-line-soft' : ''
                  }`}
                >
                  <div className="col-span-3 font-mono text-xs text-ink-soft">
                    {formatDateTime(row.submittedAt)}
                  </div>
                  <div className="col-span-3 text-ink">
                    {moduleLabels[row.module]}
                  </div>
                  <div className="col-span-2 text-ink-soft">{row.level}</div>
                  <div className="col-span-2">
                    <span className="font-medium text-ink">{row.score}</span>
                    <span className="text-muted"> / 100</span>
                  </div>
                  <div className="col-span-2">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span
                        className="block h-1.5 w-1.5 rounded-full"
                        style={{
                          background: passed
                            ? 'oklch(0.62 0.15 150)'
                            : 'oklch(0.6 0.18 25)',
                        }}
                        aria-hidden="true"
                      />
                      <span
                        style={{
                          color: passed
                            ? 'oklch(0.42 0.13 150)'
                            : 'oklch(0.45 0.17 25)',
                        }}
                      >
                        {passed ? t('statusBestanden') : t('statusNicht')}
                      </span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

    </div>
  )
}

/** Stat card matching the prototype (docs/Redesign.html:752-763). */
function StatCard({
  label,
  value,
  suffix,
}: {
  label: string
  value: string
  suffix?: string
}) {
  return (
    <div className="rounded-rad-sm border border-line bg-card p-5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </div>
      <div className="mt-3 font-display text-4xl leading-none tracking-[-0.025em] text-ink">
        {value}
        {suffix && (
          <span className="text-sm font-normal text-muted"> {suffix}</span>
        )}
      </div>
    </div>
  )
}
