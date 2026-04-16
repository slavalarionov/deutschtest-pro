// server-only — агрегирует данные user_attempts для генерации рекомендаций
// и инкапсулирует логику кеша в profiles.cached_recommendations.

import { createServerClient } from '@/lib/supabase-server'
import { generateRecommendations, type Recommendations } from '@/lib/claude'
import type { Json } from '@/types/supabase'
import type {
  RecommendationsAttemptSummary,
  RecommendationsInput,
  RecommendationsLevel,
  RecommendationsModule,
} from '@/prompts/recommendations'

const VALID_MODULES: RecommendationsModule[] = ['lesen', 'horen', 'schreiben', 'sprechen']
const VALID_LEVELS: RecommendationsLevel[] = ['A1', 'A2', 'B1']

export interface RecommendationsPayload {
  recommendations: Recommendations | null
  attemptsCount: number
  generatedAt: string | null
  cached: boolean
}

interface AttemptRow {
  level: string
  scores: unknown
  ai_feedback: unknown
  submitted_at: string | null
}

function extractModuleScore(
  scores: unknown
): { module: RecommendationsModule; score: number } | null {
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

function extractFeedbackComment(feedback: unknown): string | null {
  if (!feedback || typeof feedback !== 'object') return null
  const obj = feedback as Record<string, unknown>
  for (const id of VALID_MODULES) {
    const moduleFb = obj[id]
    if (moduleFb && typeof moduleFb === 'object') {
      const comment = (moduleFb as Record<string, unknown>).comment
      if (typeof comment === 'string' && comment.trim()) return comment.trim()
    }
  }
  const topLevel = obj.comment
  if (typeof topLevel === 'string' && topLevel.trim()) return topLevel.trim()
  return null
}

function buildRecommendationsInput(rows: AttemptRow[]): RecommendationsInput | null {
  const attempts: RecommendationsAttemptSummary[] = []

  for (const row of rows) {
    if (!row.submitted_at) continue
    const pair = extractModuleScore(row.scores)
    if (!pair) continue
    if (!(VALID_LEVELS as string[]).includes(row.level)) continue
    attempts.push({
      module: pair.module,
      level: row.level as RecommendationsLevel,
      score: pair.score,
      submittedAt: row.submitted_at,
      aiFeedbackComment: extractFeedbackComment(row.ai_feedback),
    })
  }

  if (attempts.length === 0) return null

  const totalAttempts = attempts.length
  const averageScore = Math.round(
    attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts
  )
  const bestScore = attempts.reduce((best, a) => Math.max(best, a.score), 0)

  const moduleBuckets = new Map<RecommendationsModule, { sum: number; count: number }>()
  for (const a of attempts) {
    const b = moduleBuckets.get(a.module) ?? { sum: 0, count: 0 }
    b.sum += a.score
    b.count += 1
    moduleBuckets.set(a.module, b)
  }
  const moduleAverages = VALID_MODULES.flatMap((m) => {
    const b = moduleBuckets.get(m)
    if (!b) return []
    return [{ module: m, averageScore: Math.round(b.sum / b.count), attempts: b.count }]
  })

  const levelBuckets = new Map<RecommendationsLevel, { sum: number; count: number }>()
  for (const a of attempts) {
    const b = levelBuckets.get(a.level) ?? { sum: 0, count: 0 }
    b.sum += a.score
    b.count += 1
    levelBuckets.set(a.level, b)
  }
  const levelAverages = VALID_LEVELS.flatMap((l) => {
    const b = levelBuckets.get(l)
    if (!b) return []
    return [{ level: l, averageScore: Math.round(b.sum / b.count), attempts: b.count }]
  })

  let weakestModule: RecommendationsModule | null = null
  let strongestModule: RecommendationsModule | null = null
  if (moduleAverages.length > 0) {
    let weakest = moduleAverages[0]
    let strongest = moduleAverages[0]
    for (const m of moduleAverages) {
      if (m.averageScore < weakest.averageScore) weakest = m
      if (m.averageScore > strongest.averageScore) strongest = m
    }
    weakestModule = weakest.module
    strongestModule = strongest.module
  }

  return {
    totalAttempts,
    averageScore,
    bestScore,
    attempts,
    moduleAverages,
    levelAverages,
    weakestModule,
    strongestModule,
  }
}

export async function loadRecommendations(
  userId: string,
  opts: { forceRefresh?: boolean } = {}
): Promise<RecommendationsPayload> {
  const supabase = createServerClient()

  const [attemptsRes, profileRes] = await Promise.all([
    supabase
      .from('user_attempts')
      .select('level, scores, ai_feedback, submitted_at')
      .eq('user_id', userId)
      .not('submitted_at', 'is', null)
      .not('scores', 'is', null)
      .order('submitted_at', { ascending: true }),
    supabase
      .from('profiles')
      .select(
        'cached_recommendations, recommendations_attempts_count, recommendations_generated_at'
      )
      .eq('id', userId)
      .maybeSingle(),
  ])

  if (attemptsRes.error) {
    console.error('[dashboard/recommendations] attempts query:', attemptsRes.error.message)
    return { recommendations: null, attemptsCount: 0, generatedAt: null, cached: false }
  }

  const input = buildRecommendationsInput(attemptsRes.data ?? [])

  if (!input) {
    return { recommendations: null, attemptsCount: 0, generatedAt: null, cached: false }
  }

  const profile = profileRes.data
  const cachedCount = profile?.recommendations_attempts_count ?? null
  const cachedAt = profile?.recommendations_generated_at ?? null
  const cachedRecs = profile?.cached_recommendations ?? null

  const cacheFresh =
    !opts.forceRefresh &&
    cachedRecs !== null &&
    cachedCount === input.totalAttempts

  if (cacheFresh) {
    return {
      recommendations: cachedRecs as unknown as Recommendations,
      attemptsCount: input.totalAttempts,
      generatedAt: cachedAt,
      cached: true,
    }
  }

  const recommendations = await generateRecommendations(input)
  const generatedAt = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      cached_recommendations: recommendations as unknown as Json,
      recommendations_attempts_count: input.totalAttempts,
      recommendations_generated_at: generatedAt,
    })
    .eq('id', userId)

  if (updateError) {
    console.warn('[dashboard/recommendations] cache update failed:', updateError.message)
  }

  return {
    recommendations,
    attemptsCount: input.totalAttempts,
    generatedAt,
    cached: false,
  }
}
