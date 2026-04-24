// Client-side helpers for ProgressView. Pure functions — no network calls,
// no mutation of the server-side payload coming from lib/dashboard/progress.ts.
//
// Two transforms live here:
//   * bucketPointsByWeek: collapse raw ProgressPoint[] into N weekly buckets
//     ending "today" (Mon–Sun, UTC). Empty weeks hold `null` so the chart can
//     break the line via connectNulls={false}.
//   * computeModuleDeltas: per-module 4-week vs previous-4-week average delta.
//
// Used by components/dashboard/ProgressView.tsx.

import type { ProgressLevel, ProgressModule, ProgressPoint } from './progress'

export interface WeeklyBucket {
  /** Short label, chronological: "W1" oldest, "W{weeksCount}" newest. */
  week: string
  /** ISO date (YYYY-MM-DD) of the Monday starting this week. */
  weekStart: string
  /** Mean of all scores submitted inside this week, or null if none. */
  score: number | null
}

export interface PerModuleWeeklyBucket {
  week: string
  weekStart: string
  lesen: number | null
  horen: number | null
  schreiben: number | null
  sprechen: number | null
  lesenCount: number
  horenCount: number
  schreibenCount: number
  sprechenCount: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_WEEK = 7 * MS_PER_DAY

/** Return the UTC Monday of the week containing `date` as YYYY-MM-DD. */
function isoMonday(date: Date): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
  // getUTCDay: Sun = 0, Mon = 1, ..., Sat = 6.
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

/** Collapse points into N weekly averages ending today. */
export function bucketPointsByWeek(
  points: ProgressPoint[],
  weeksCount: number = 12
): WeeklyBucket[] {
  const now = new Date()
  const currentMondayIso = isoMonday(now)
  const currentMonday = new Date(`${currentMondayIso}T00:00:00.000Z`)

  const buckets: { start: Date; startIso: string; scores: number[] }[] = []
  for (let i = weeksCount - 1; i >= 0; i--) {
    const start = new Date(currentMonday.getTime() - i * MS_PER_WEEK)
    buckets.push({
      start,
      startIso: start.toISOString().slice(0, 10),
      scores: [],
    })
  }

  const firstStart = buckets[0]?.start.getTime() ?? currentMonday.getTime()
  const windowEnd = currentMonday.getTime() + MS_PER_WEEK // exclusive

  for (const p of points) {
    const ts = new Date(p.submittedAt).getTime()
    if (Number.isNaN(ts)) continue
    if (ts < firstStart || ts >= windowEnd) continue
    const idx = Math.floor((ts - firstStart) / MS_PER_WEEK)
    if (idx < 0 || idx >= buckets.length) continue
    buckets[idx].scores.push(p.score)
  }

  return buckets.map((b, i) => ({
    week: `W${i + 1}`,
    weekStart: b.startIso,
    score:
      b.scores.length === 0
        ? null
        : Math.round(b.scores.reduce((a, s) => a + s, 0) / b.scores.length),
  }))
}

/**
 * Per-module weekly averages for a given level. Produces weeksCount buckets
 * ending at the current week (UTC Monday). Empty weeks carry `null` per module
 * so recharts can break each line independently via connectNulls={false}.
 */
export function bucketPointsByWeekPerModule(
  points: ProgressPoint[],
  level: ProgressLevel,
  weeksCount: number = 12
): PerModuleWeeklyBucket[] {
  const now = new Date()
  const currentMondayIso = isoMonday(now)
  const currentMonday = new Date(`${currentMondayIso}T00:00:00.000Z`)

  type Slot = {
    start: Date
    startIso: string
    lesen: number[]
    horen: number[]
    schreiben: number[]
    sprechen: number[]
  }
  const buckets: Slot[] = []
  for (let i = weeksCount - 1; i >= 0; i--) {
    const start = new Date(currentMonday.getTime() - i * MS_PER_WEEK)
    buckets.push({
      start,
      startIso: start.toISOString().slice(0, 10),
      lesen: [],
      horen: [],
      schreiben: [],
      sprechen: [],
    })
  }

  const firstStart = buckets[0]?.start.getTime() ?? currentMonday.getTime()
  const windowEnd = currentMonday.getTime() + MS_PER_WEEK

  for (const p of points) {
    if (p.level !== level) continue
    const ts = new Date(p.submittedAt).getTime()
    if (Number.isNaN(ts)) continue
    if (ts < firstStart || ts >= windowEnd) continue
    const idx = Math.floor((ts - firstStart) / MS_PER_WEEK)
    if (idx < 0 || idx >= buckets.length) continue
    buckets[idx][p.module].push(p.score)
  }

  const mean = (xs: number[]): number | null =>
    xs.length === 0 ? null : Math.round(xs.reduce((a, s) => a + s, 0) / xs.length)

  return buckets.map((b, i) => ({
    week: `W${i + 1}`,
    weekStart: b.startIso,
    lesen: mean(b.lesen),
    horen: mean(b.horen),
    schreiben: mean(b.schreiben),
    sprechen: mean(b.sprechen),
    lesenCount: b.lesen.length,
    horenCount: b.horen.length,
    schreibenCount: b.schreiben.length,
    sprechenCount: b.sprechen.length,
  }))
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

const MODULES: ProgressModule[] = ['lesen', 'horen', 'schreiben', 'sprechen']

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
