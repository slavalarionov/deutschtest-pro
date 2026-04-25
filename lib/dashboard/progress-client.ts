// Client-side helpers for ProgressView. Pure functions — no network calls,
// no mutation of the server-side payload coming from lib/dashboard/progress.ts.
//
// Transforms live here:
//   * buildPerAttemptSeriesForLevel: arrange attempts per module in
//     chronological order and produce a single series indexed by attempt
//     number (1..maxCount). Each row carries score + timestamp per module,
//     or null when that module has no attempt at that index.
//   * computeModuleDeltas: per-module 4-week vs previous-4-week average delta.
//   * countAttempts* helpers for legend and default level selection.
//
// Used by components/dashboard/ProgressView.tsx.

import type { ProgressLevel, ProgressModule, ProgressPoint } from './progress'

export interface PerAttemptPoint {
  attemptIndex: number
  lesen: number | null
  horen: number | null
  schreiben: number | null
  sprechen: number | null
  lesenAt: string | null
  horenAt: string | null
  schreibenAt: string | null
  sprechenAt: string | null
}

export interface PerAttemptSeries {
  series: PerAttemptPoint[]
  counts: Record<ProgressModule, number>
  maxCount: number
  axisLength: number
}

const MODULES: ProgressModule[] = ['lesen', 'horen', 'schreiben', 'sprechen']
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

// Minimum number of attempt slots to show on the X axis. Below this, the
// axis is padded with empty ticks so users see the runway ahead.
const MIN_AXIS_SLOTS = 20

/**
 * Build a per-attempt series for a given level.
 * Input `points` is expected sorted ascending by submittedAt (as loadProgressData returns).
 * Each module's attempts are ordered independently; attemptIndex is shared across modules
 * so all lines start at x=1 on the left.
 */
export function buildPerAttemptSeriesForLevel(
  points: ProgressPoint[],
  level: ProgressLevel
): PerAttemptSeries {
  const perModule: Record<ProgressModule, ProgressPoint[]> = {
    lesen: [],
    horen: [],
    schreiben: [],
    sprechen: [],
  }
  for (const p of points) {
    if (p.level !== level) continue
    perModule[p.module].push(p)
  }

  const counts: Record<ProgressModule, number> = {
    lesen: perModule.lesen.length,
    horen: perModule.horen.length,
    schreiben: perModule.schreiben.length,
    sprechen: perModule.sprechen.length,
  }
  const maxCount = Math.max(counts.lesen, counts.horen, counts.schreiben, counts.sprechen)
  const axisLength = Math.max(MIN_AXIS_SLOTS, maxCount)

  const series: PerAttemptPoint[] = []
  for (let i = 0; i < axisLength; i++) {
    series.push({
      attemptIndex: i + 1,
      lesen: perModule.lesen[i]?.score ?? null,
      horen: perModule.horen[i]?.score ?? null,
      schreiben: perModule.schreiben[i]?.score ?? null,
      sprechen: perModule.sprechen[i]?.score ?? null,
      lesenAt: perModule.lesen[i]?.submittedAt ?? null,
      horenAt: perModule.horen[i]?.submittedAt ?? null,
      schreibenAt: perModule.schreiben[i]?.submittedAt ?? null,
      sprechenAt: perModule.sprechen[i]?.submittedAt ?? null,
    })
  }

  return { series, counts, maxCount, axisLength }
}

/** Total attempts per level (for default-level auto-selection). */
export function countAttemptsByLevel(
  points: ProgressPoint[]
): Record<ProgressLevel, number> {
  const out: Record<ProgressLevel, number> = { A1: 0, A2: 0, B1: 0 }
  for (const p of points) out[p.level] += 1
  return out
}

/** Total attempts per module on a given level. */
export function countAttemptsByModuleForLevel(
  points: ProgressPoint[],
  level: ProgressLevel
): Record<ProgressModule, number> {
  const out: Record<ProgressModule, number> = {
    lesen: 0,
    horen: 0,
    schreiben: 0,
    sprechen: 0,
  }
  for (const p of points) {
    if (p.level === level) out[p.module] += 1
  }
  return out
}

export interface ModuleDelta {
  current: number | null
  previous: number | null
  delta: number | null
}

/**
 * Per-module comparison between the last 4 weeks and the preceding 4 weeks
 * (weeks 8..4 before now). `null` fields mean there is not enough data for
 * that side of the comparison — the UI renders them as "—".
 */
export function computeModuleDeltas(
  points: ProgressPoint[]
): Record<ProgressModule, ModuleDelta> {
  const now = Date.now()
  const currentStart = now - 4 * MS_PER_WEEK
  const previousStart = now - 8 * MS_PER_WEEK
  const previousEnd = currentStart

  const current: Record<ProgressModule, number[]> = {
    lesen: [],
    horen: [],
    schreiben: [],
    sprechen: [],
  }
  const previous: Record<ProgressModule, number[]> = {
    lesen: [],
    horen: [],
    schreiben: [],
    sprechen: [],
  }

  for (const p of points) {
    const ts = new Date(p.submittedAt).getTime()
    if (Number.isNaN(ts)) continue
    if (ts >= currentStart && ts <= now) {
      current[p.module].push(p.score)
    } else if (ts >= previousStart && ts < previousEnd) {
      previous[p.module].push(p.score)
    }
  }

  const avg = (xs: number[]): number | null =>
    xs.length === 0 ? null : Math.round(xs.reduce((a, s) => a + s, 0) / xs.length)

  const result = {} as Record<ProgressModule, ModuleDelta>
  for (const m of MODULES) {
    const cur = avg(current[m])
    const prev = avg(previous[m])
    result[m] = {
      current: cur,
      previous: prev,
      delta: cur !== null && prev !== null ? cur - prev : null,
    }
  }
  return result
}

export interface LastThreeAverage {
  /** Rounded average of the last three attempts. null when count < 3. */
  avg: number | null
  /** Total attempts the user has on this module across all levels. */
  count: number
}

/**
 * Per-module average over the last three attempts (across all levels),
 * ordered chronologically by submittedAt. Used by per-module dashboard
 * cards to show recent stability rather than lifetime averages.
 *
 * Input `points` is expected sorted ascending by submittedAt.
 */
export function computeLastThreeAverages(
  points: ProgressPoint[]
): Record<ProgressModule, LastThreeAverage> {
  const buckets: Record<ProgressModule, ProgressPoint[]> = {
    lesen: [],
    horen: [],
    schreiben: [],
    sprechen: [],
  }
  for (const p of points) buckets[p.module].push(p)

  const result = {} as Record<ProgressModule, LastThreeAverage>
  for (const m of MODULES) {
    const all = buckets[m]
    const count = all.length
    if (count < 3) {
      result[m] = { avg: null, count }
      continue
    }
    const lastThree = all.slice(-3)
    const sum = lastThree.reduce((acc, p) => acc + p.score, 0)
    result[m] = { avg: Math.round(sum / 3), count }
  }
  return result
}
