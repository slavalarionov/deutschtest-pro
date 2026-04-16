// server-only
import { createServerClient } from '@/lib/supabase-server'

export type DashboardModule = 'lesen' | 'horen' | 'schreiben' | 'sprechen'

export interface LastModuleStat {
  moduleId: DashboardModule
  score: number
  level: string
  submittedAt: string
}

export interface DashboardStats {
  totalModules: number
  averageScore: number | null
  bestScore: number | null
  lastModule: LastModuleStat | null
  modulesBalance: number
}

const VALID_MODULES: DashboardModule[] = ['lesen', 'horen', 'schreiben', 'sprechen']

/**
 * Extracts the (module, score) pair from a user_attempts row. In the single-flow
 * world each completed attempt stores exactly one module key in `scores`. We pick
 * the first valid key; if none matches, return null and skip the row.
 */
function extractModuleScore(
  scores: unknown
): { moduleId: DashboardModule; score: number } | null {
  if (!scores || typeof scores !== 'object') return null
  const obj = scores as Record<string, unknown>
  for (const id of VALID_MODULES) {
    const value = obj[id]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return { moduleId: id, score: value }
    }
  }
  return null
}

export async function loadDashboardStats(
  userId: string
): Promise<DashboardStats> {
  const supabase = createServerClient()

  const [attemptsRes, profileRes] = await Promise.all([
    supabase
      .from('user_attempts')
      .select('level, scores, submitted_at')
      .eq('user_id', userId)
      .not('submitted_at', 'is', null)
      .not('scores', 'is', null)
      .order('submitted_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('modules_balance')
      .eq('id', userId)
      .maybeSingle(),
  ])

  const modulesBalance =
    typeof profileRes.data?.modules_balance === 'number'
      ? profileRes.data.modules_balance
      : 0

  const rows = attemptsRes.data ?? []

  let totalModules = 0
  let scoreSum = 0
  let bestScore: number | null = null
  let lastModule: LastModuleStat | null = null

  for (const row of rows) {
    const pair = extractModuleScore(row.scores)
    if (!pair) continue
    totalModules += 1
    scoreSum += pair.score
    if (bestScore === null || pair.score > bestScore) bestScore = pair.score
    if (!lastModule && row.submitted_at) {
      lastModule = {
        moduleId: pair.moduleId,
        score: pair.score,
        level: row.level as string,
        submittedAt: row.submitted_at as string,
      }
    }
  }

  const averageScore = totalModules > 0 ? Math.round(scoreSum / totalModules) : null

  return {
    totalModules,
    averageScore,
    bestScore,
    lastModule,
    modulesBalance,
  }
}
