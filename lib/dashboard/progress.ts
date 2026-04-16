// server-only
import { createServerClient } from '@/lib/supabase-server'

export type ProgressModule = 'lesen' | 'horen' | 'schreiben' | 'sprechen'
export type ProgressLevel = 'A1' | 'A2' | 'B1'
export type Trend = 'improving' | 'stable' | 'declining'

export interface ProgressPoint {
  submittedAt: string
  module: ProgressModule
  level: ProgressLevel
  score: number
}

export interface ModuleAverage {
  module: ProgressModule
  averageScore: number
  attempts: number
}

export interface LevelAverage {
  level: ProgressLevel
  averageScore: number
  attempts: number
}

export interface MonthlyTrend {
  trend: Trend
  currentMonthAverage: number | null
  previousMonthAverage: number | null
  delta: number | null
}

export interface ProgressData {
  points: ProgressPoint[]
  moduleAverages: ModuleAverage[]
  levelAverages: LevelAverage[]
  weakestModule: ModuleAverage | null
  strongestModule: ModuleAverage | null
  monthlyTrend: MonthlyTrend
}

const VALID_MODULES: ProgressModule[] = ['lesen', 'horen', 'schreiben', 'sprechen']
const VALID_LEVELS: ProgressLevel[] = ['A1', 'A2', 'B1']

function extractModuleScore(
  scores: unknown
): { module: ProgressModule; score: number } | null {
  if (!scores || typeof scores !== 'object') return null
  const obj = scores as Record<string, unknown>
  for (const id of VALID_MODULES) {
    const value = obj[id]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return { module: id, score: value }
    }
  }
  return null
}

function monthKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function previousMonthKey(current: string): string {
  const [year, month] = current.split('-').map(Number)
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`
}

export async function loadProgressData(userId: string): Promise<ProgressData> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('user_attempts')
    .select('level, scores, submitted_at')
    .eq('user_id', userId)
    .not('submitted_at', 'is', null)
    .not('scores', 'is', null)
    .order('submitted_at', { ascending: true })

  if (error) {
    console.error('[dashboard/progress] query:', error.message)
    return emptyProgress()
  }

  const rows = data ?? []
  const points: ProgressPoint[] = []

  for (const row of rows) {
    const pair = extractModuleScore(row.scores)
    if (!pair) continue
    if (!row.submitted_at) continue
    const level = row.level as string
    if (!(VALID_LEVELS as string[]).includes(level)) continue
    points.push({
      submittedAt: row.submitted_at as string,
      module: pair.module,
      level: level as ProgressLevel,
      score: pair.score,
    })
  }

  const moduleAverages = buildModuleAverages(points)
  const levelAverages = buildLevelAverages(points)
  const { weakest, strongest } = pickExtremes(moduleAverages)
  const monthlyTrend = buildMonthlyTrend(points)

  return {
    points,
    moduleAverages,
    levelAverages,
    weakestModule: weakest,
    strongestModule: strongest,
    monthlyTrend,
  }
}

function emptyProgress(): ProgressData {
  return {
    points: [],
    moduleAverages: [],
    levelAverages: [],
    weakestModule: null,
    strongestModule: null,
    monthlyTrend: {
      trend: 'stable',
      currentMonthAverage: null,
      previousMonthAverage: null,
      delta: null,
    },
  }
}

function buildModuleAverages(points: ProgressPoint[]): ModuleAverage[] {
  const buckets = new Map<ProgressModule, { sum: number; count: number }>()
  for (const p of points) {
    const b = buckets.get(p.module) ?? { sum: 0, count: 0 }
    b.sum += p.score
    b.count += 1
    buckets.set(p.module, b)
  }
  const result: ModuleAverage[] = []
  for (const id of VALID_MODULES) {
    const b = buckets.get(id)
    if (!b || b.count === 0) continue
    result.push({
      module: id,
      averageScore: Math.round(b.sum / b.count),
      attempts: b.count,
    })
  }
  return result
}

function buildLevelAverages(points: ProgressPoint[]): LevelAverage[] {
  const buckets = new Map<ProgressLevel, { sum: number; count: number }>()
  for (const p of points) {
    const b = buckets.get(p.level) ?? { sum: 0, count: 0 }
    b.sum += p.score
    b.count += 1
    buckets.set(p.level, b)
  }
  const result: LevelAverage[] = []
  for (const level of VALID_LEVELS) {
    const b = buckets.get(level)
    if (!b || b.count === 0) continue
    result.push({
      level,
      averageScore: Math.round(b.sum / b.count),
      attempts: b.count,
    })
  }
  return result
}

function pickExtremes(averages: ModuleAverage[]): {
  weakest: ModuleAverage | null
  strongest: ModuleAverage | null
} {
  if (averages.length === 0) return { weakest: null, strongest: null }
  let weakest = averages[0]
  let strongest = averages[0]
  for (const a of averages) {
    if (a.averageScore < weakest.averageScore) weakest = a
    if (a.averageScore > strongest.averageScore) strongest = a
  }
  return { weakest, strongest }
}

function buildMonthlyTrend(points: ProgressPoint[]): MonthlyTrend {
  if (points.length === 0) {
    return {
      trend: 'stable',
      currentMonthAverage: null,
      previousMonthAverage: null,
      delta: null,
    }
  }

  const buckets = new Map<string, { sum: number; count: number }>()
  for (const p of points) {
    const key = monthKey(p.submittedAt)
    const b = buckets.get(key) ?? { sum: 0, count: 0 }
    b.sum += p.score
    b.count += 1
    buckets.set(key, b)
  }

  const latest = points[points.length - 1]
  const currentKey = monthKey(latest.submittedAt)
  const previousKey = previousMonthKey(currentKey)

  const current = buckets.get(currentKey)
  const previous = buckets.get(previousKey)

  const currentMonthAverage = current
    ? Math.round(current.sum / current.count)
    : null
  const previousMonthAverage = previous
    ? Math.round(previous.sum / previous.count)
    : null

  let trend: Trend = 'stable'
  let delta: number | null = null
  if (currentMonthAverage !== null && previousMonthAverage !== null) {
    delta = currentMonthAverage - previousMonthAverage
    if (delta >= 3) trend = 'improving'
    else if (delta <= -3) trend = 'declining'
    else trend = 'stable'
  }

  return { trend, currentMonthAverage, previousMonthAverage, delta }
}
