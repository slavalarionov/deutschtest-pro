'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

/**
 * Landing · ProgressSection — the animated wow block.
 *
 * Renders a Recharts LineChart with hardcoded demo data for the three target
 * Goethe levels (A1 / A2 / B1). The chart only mounts once it scrolls into
 * view — that lets Recharts run its built-in stroke-dashoffset animation
 * fresh, drawing each module line left-to-right with a 250ms stagger.
 *
 * Per-module colours route through the centralised --chart-* tokens declared
 * in app/globals.css — the same palette powers the dashboard chart, so the
 * landing and account read in identical hues.
 *
 * prefers-reduced-motion is respected: when set, the chart appears in its
 * final state without entry / line-draw animations and without the entry
 * fade-in container transition.
 */

type Level = 'A1' | 'A2' | 'B1'
type ModuleKey = 'lesen' | 'horen' | 'schreiben' | 'sprechen'

const LEVELS: readonly Level[] = ['A1', 'A2', 'B1'] as const
const MODULES: readonly ModuleKey[] = [
  'lesen',
  'horen',
  'schreiben',
  'sprechen',
] as const

const MODULE_COLOR: Record<ModuleKey, string> = {
  lesen: 'var(--chart-lesen)',
  horen: 'var(--chart-horen)',
  schreiben: 'var(--chart-schreiben)',
  sprechen: 'var(--chart-sprechen)',
}

type DataPoint = {
  attempt: number
  lesen?: number
  horen?: number
  schreiben?: number
  sprechen?: number
}

// Demo arcs — different attempt counts per module so the lines do not collide
// and the legend numbers tell a story (Sprechen barely scrapes the threshold,
// Schreiben keeps grinding longer). Each line carries a small early regress
// (attempt 1 → 2 dips before the climb) — that is what a real learning curve
// looks like; perfectly monotonic growth reads as fabricated. Numbers are
// decorative, not real user data.
const DEMO_DATA: Record<Level, DataPoint[]> = {
  A1: [
    { attempt: 1, lesen: 50, horen: 45, schreiben: 40, sprechen: 40 },
    { attempt: 2, lesen: 48, horen: 42, schreiben: 38, sprechen: 38 },
    { attempt: 3, lesen: 54, horen: 48, schreiben: 42, sprechen: 43 },
    { attempt: 4, lesen: 60, horen: 53, schreiben: 46, sprechen: 48 },
    { attempt: 5, lesen: 65, horen: 58, schreiben: 50, sprechen: 53 },
    { attempt: 6, lesen: 70, horen: 62, schreiben: 53, sprechen: 56 },
    { attempt: 7, lesen: 73, horen: 65, schreiben: 56, sprechen: 60 },
    { attempt: 8, lesen: 75, horen: 67, schreiben: 59 },
    { attempt: 9, horen: 69, schreiben: 61 },
    { attempt: 10, horen: 70, schreiben: 63 },
    { attempt: 11, schreiben: 64 },
    { attempt: 12, schreiben: 65 },
  ],
  A2: [
    { attempt: 1, lesen: 42, horen: 40, schreiben: 35, sprechen: 28 },
    { attempt: 2, lesen: 40, horen: 38, schreiben: 33, sprechen: 26 },
    { attempt: 3, lesen: 45, horen: 43, schreiben: 38, sprechen: 32 },
    { attempt: 4, lesen: 50, horen: 47, schreiben: 42, sprechen: 37 },
    { attempt: 5, lesen: 55, horen: 51, schreiben: 46, sprechen: 42 },
    { attempt: 6, lesen: 58, horen: 54, schreiben: 49, sprechen: 46 },
    { attempt: 7, horen: 56, schreiben: 52 },
    { attempt: 8, schreiben: 54 },
    { attempt: 9, schreiben: 55 },
  ],
  B1: [
    { attempt: 1, lesen: 38, horen: 36, schreiben: 30, sprechen: 22 },
    { attempt: 2, lesen: 35, horen: 33, schreiben: 28, sprechen: 20 },
    { attempt: 3, lesen: 42, horen: 40, schreiben: 35, sprechen: 28 },
    { attempt: 4, lesen: 48, horen: 44, schreiben: 39 },
    { attempt: 5, horen: 47, schreiben: 42 },
  ],
}

function attemptsCount(level: Level, key: ModuleKey): number {
  return DEMO_DATA[level].reduce(
    (acc, row) => (row[key] != null ? acc + 1 : acc),
    0,
  )
}

const PASS_THRESHOLD = 60

export function ProgressSection() {
  const t = useTranslations('landing.progress')
  const [level, setLevel] = useState<Level>('A1')
  const [inView, setInView] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  // Animation epoch — bumped on every level change so the chart re-mounts and
  // Recharts replays its line-draw animation. Without a key bump the new data
  // would interpolate in place and you'd lose the wow.
  const [epoch, setEpoch] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const node = ref.current
    if (!node) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true)
            obs.disconnect()
            break
          }
        }
      },
      { threshold: 0.4 },
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [])

  const animate = inView && !reducedMotion

  return (
    <section
      id="progress"
      className="bg-page px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="eyebrow mb-3">{t('eyebrow')}</div>
        <h2 className="font-display text-4xl leading-none tracking-tighter text-ink sm:text-5xl lg:text-[64px]">
          {t('titleStrong')}
          <br />
          <span className="italic text-muted">{t('titleMuted')}</span>
        </h2>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-soft sm:mt-8 sm:text-lg">
          {t('subtitle')}
        </p>

        {/* Chart card */}
        <div
          ref={ref}
          className="mt-12 rounded-rad border border-line bg-card p-5 shadow-lift sm:mt-16 sm:p-8 lg:p-10"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted">
                {t('chartEyebrow')}
              </div>
              <h3 className="mt-1 font-display text-2xl leading-tight tracking-tight text-ink sm:text-[28px]">
                {t('chartTitle')}
              </h3>
            </div>

            <LevelSwitcher
              level={level}
              onChange={(next) => {
                if (next === level) return
                setLevel(next)
                setEpoch((n) => n + 1)
              }}
            />
          </div>

          {/* Chart wrapper — animates opacity in once when entering viewport.
              Recharts is mounted only when in view so its built-in line-draw
              animation runs fresh from t=0 instead of behind the curtain. */}
          <div
            className="mt-8 h-[300px] sm:h-[360px]"
            style={{
              opacity: inView ? 1 : 0,
              transition: animate
                ? 'opacity 400ms ease-out'
                : 'opacity 0ms',
            }}
          >
            {inView ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  key={`${level}-${epoch}`}
                  data={DEMO_DATA[level]}
                  margin={{ top: 8, right: 24, bottom: 24, left: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="2 4"
                    stroke="var(--line)"
                  />
                  <XAxis
                    dataKey="attempt"
                    type="number"
                    domain={[1, 20]}
                    ticks={[1, 4, 8, 12, 16, 20]}
                    tick={{
                      fill: 'var(--muted)',
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                    }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--line)' }}
                    label={{
                      value: t('xLabel'),
                      position: 'insideBottom',
                      offset: -14,
                      fill: 'var(--muted)',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tick={{
                      fill: 'var(--muted)',
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                    }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--line)' }}
                    width={40}
                  />
                  <ReferenceLine
                    y={PASS_THRESHOLD}
                    stroke="var(--ink-soft)"
                    strokeDasharray="4 6"
                    label={{
                      value: t('passLabel'),
                      position: 'right',
                      fill: 'var(--muted)',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                  {MODULES.map((m, i) => (
                    <Line
                      key={m}
                      dataKey={m}
                      type="monotone"
                      stroke={MODULE_COLOR[m]}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={animate}
                      animationBegin={animate ? 400 + i * 250 : 0}
                      animationDuration={animate ? 700 : 0}
                      animationEasing="ease-out"
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </div>

          {/* Legend — entries fade + slide in with the same cadence as their
              line draws. Counts come from the demo data so the numbers match
              the actual line lengths. */}
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
            {MODULES.map((m, i) => {
              const count = attemptsCount(level, m)
              return (
                <div
                  key={m}
                  className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-ink-soft"
                  style={{
                    opacity: animate || (inView && reducedMotion) ? 1 : 0,
                    transform:
                      animate || (inView && reducedMotion)
                        ? 'translateY(0)'
                        : 'translateY(8px)',
                    transition: animate
                      ? `opacity 400ms ease-out ${500 + i * 250}ms, transform 400ms ease-out ${500 + i * 250}ms`
                      : 'opacity 0ms, transform 0ms',
                  }}
                >
                  <span
                    aria-hidden
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: MODULE_COLOR[m] }}
                  />
                  <span className="text-ink">{t(`modules.${m}`)}</span>
                  <span className="text-muted">·</span>
                  <span className="tabular-nums text-muted">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function LevelSwitcher({
  level,
  onChange,
}: {
  level: Level
  onChange: (next: Level) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Level"
      className="inline-flex rounded-rad-pill border border-line bg-surface p-1 font-mono text-[11px] uppercase tracking-wider"
    >
      {LEVELS.map((lvl) => {
        const active = lvl === level
        return (
          <button
            key={lvl}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(lvl)}
            className={[
              'rounded-rad-pill px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card',
              active
                ? 'bg-ink text-card'
                : 'text-ink-soft hover:text-ink',
            ].join(' ')}
          >
            {lvl}
          </button>
        )
      })}
    </div>
  )
}
