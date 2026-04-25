// server-only — orchestrates generation of a fresh recommendations snapshot:
//   1. Run Claude with Tool Use → structured weak_areas[] + summary_text
//   2. Match weak_areas against learning_resources (curated catalog) →
//      preserve URLs at generation time so shared public_id stays stable
//   3. INSERT a new user_recommendations row, update profiles pointer

import { createServerClient } from '@/lib/supabase-server'
import { generateRecommendations, type WeakArea, type Recommendations } from '@/lib/claude'
import { defaultLocale, locales, type Locale } from '@/i18n/request'
import type { Json } from '@/types/supabase'
import type {
  RecommendationsAttemptSummary,
  RecommendationsInput,
  RecommendationsLevel,
  RecommendationsModule,
} from '@/prompts/recommendations'

const VALID_MODULES: RecommendationsModule[] = ['lesen', 'horen', 'schreiben', 'sprechen']
const VALID_LEVELS: RecommendationsLevel[] = ['A1', 'A2', 'B1']

interface AttemptRow {
  level: string
  scores: unknown
  ai_feedback: unknown
  submitted_at: string | null
}

export interface MatchedResource {
  id: string
  title: string
  url: string
  description: string | null
  resource_type: 'book' | 'video' | 'exercise' | 'website' | 'app' | 'article'
  module: 'lesen' | 'horen' | 'schreiben' | 'sprechen'
  level: 'a1' | 'a2' | 'b1'
  topic: string
  language: 'de' | 'ru' | 'en'
}

/** Top-level shape of user_recommendations.matched_resources jsonb. */
export interface MatchedResourcesIndex {
  // keyed by `${module}:${level}:${topic}` so the page can render per-area lists
  // without re-grouping at read time
  [key: string]: MatchedResource[]
}

export interface RecommendationsSnapshot {
  id: string
  user_id: string
  public_id: string | null
  is_public: boolean
  weak_areas: WeakArea[]
  summary_text: string
  matched_resources: MatchedResourcesIndex
  attempts_count: number
  language: Locale
  generated_at: string
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

function normalizeLocale(value: unknown): Locale {
  if (typeof value === 'string' && (locales as readonly string[]).includes(value)) {
    return value as Locale
  }
  return defaultLocale
}

/**
 * Resource catalog only stores three languages (de/ru/en). Turkish UI users
 * fall back to English resources — better than empty.
 */
function resourceLanguageFor(locale: Locale): 'de' | 'ru' | 'en' {
  return locale === 'tr' ? 'en' : locale
}

const SEVERITY_RANK: Record<WeakArea['severity'], number> = {
  high: 0,
  medium: 1,
  low: 2,
}

async function matchResources(
  weakAreas: WeakArea[],
  locale: Locale
): Promise<MatchedResourcesIndex> {
  if (weakAreas.length === 0) return {}

  const supabase = createServerClient()
  const language = resourceLanguageFor(locale)

  // Build OR-conditions for unique (module, level, topic) tuples.
  const seen = new Set<string>()
  const triples: Array<{ module: string; level: string; topic: string }> = []
  for (const area of weakAreas) {
    const key = `${area.module}:${area.level}:${area.topic}`
    if (seen.has(key)) continue
    seen.add(key)
    triples.push({ module: area.module, level: area.level, topic: area.topic })
  }

  const orFilter = triples
    .map((t) => `and(module.eq.${t.module},level.eq.${t.level},topic.eq.${t.topic})`)
    .join(',')

  const { data, error } = await supabase
    .from('learning_resources')
    .select('id, module, level, topic, title, url, description, resource_type, language')
    .eq('is_active', true)
    .eq('language', language)
    .or(orFilter)
    .limit(60)

  if (error) {
    console.warn('[recommendations/snapshot] matchResources query failed:', error.message)
    return {}
  }

  const index: MatchedResourcesIndex = {}
  const severityByKey = new Map<string, WeakArea['severity']>()
  for (const area of weakAreas) {
    const key = `${area.module}:${area.level}:${area.topic}`
    const prev = severityByKey.get(key)
    if (!prev || SEVERITY_RANK[area.severity] < SEVERITY_RANK[prev]) {
      severityByKey.set(key, area.severity)
    }
  }

  for (const row of data ?? []) {
    const key = `${row.module}:${row.level}:${row.topic}`
    if (!index[key]) index[key] = []
    if (index[key].length < 4) {
      index[key].push(row as MatchedResource)
    }
  }

  return index
}

export async function generateAndStoreSnapshot(
  userId: string
): Promise<RecommendationsSnapshot | null> {
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
      .select('preferred_language')
      .eq('id', userId)
      .maybeSingle(),
  ])

  if (attemptsRes.error) {
    console.error('[recommendations/snapshot] attempts query:', attemptsRes.error.message)
    return null
  }

  const input = buildRecommendationsInput(attemptsRes.data ?? [])
  if (!input) return null

  const language = normalizeLocale(profileRes.data?.preferred_language)

  const result: Recommendations = await generateRecommendations(input, language, { userId })
  const matched = await matchResources(result.weak_areas, language)

  const { data: inserted, error: insertError } = await supabase
    .from('user_recommendations')
    .insert({
      user_id: userId,
      weak_areas: result.weak_areas as unknown as Json,
      summary_text: result.summary_text,
      matched_resources: matched as unknown as Json,
      attempts_count: input.totalAttempts,
      language,
    })
    .select('*')
    .single()

  if (insertError || !inserted) {
    console.error('[recommendations/snapshot] insert failed:', insertError?.message)
    return null
  }

  await supabase
    .from('profiles')
    .update({ current_recommendations_id: inserted.id })
    .eq('id', userId)

  return {
    id: inserted.id,
    user_id: inserted.user_id,
    public_id: inserted.public_id,
    is_public: inserted.is_public,
    weak_areas: result.weak_areas,
    summary_text: result.summary_text,
    matched_resources: matched,
    attempts_count: inserted.attempts_count,
    language: inserted.language as Locale,
    generated_at: inserted.generated_at,
  }
}

/**
 * Returns the latest snapshot if it covers all current attempts, otherwise
 * regenerates. Old jsonb cache in `profiles.cached_recommendations` is
 * intentionally ignored — the schema differs and the data is stale.
 */
export async function getOrGenerateSnapshot(
  userId: string,
  opts: { forceRefresh?: boolean } = {}
): Promise<RecommendationsSnapshot | null> {
  const supabase = createServerClient()

  const [attemptsCountRes, profileRes] = await Promise.all([
    supabase
      .from('user_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('submitted_at', 'is', null)
      .not('scores', 'is', null),
    supabase
      .from('profiles')
      .select('current_recommendations_id, preferred_language')
      .eq('id', userId)
      .maybeSingle(),
  ])

  const attemptsCount = attemptsCountRes.count ?? 0
  if (attemptsCount === 0) return null

  const preferredLanguage = normalizeLocale(profileRes.data?.preferred_language)
  const currentId = profileRes.data?.current_recommendations_id ?? null

  if (!opts.forceRefresh && currentId) {
    const { data: existing } = await supabase
      .from('user_recommendations')
      .select('*')
      .eq('id', currentId)
      .maybeSingle()

    if (
      existing &&
      existing.attempts_count === attemptsCount &&
      existing.language === preferredLanguage
    ) {
      return {
        id: existing.id,
        user_id: existing.user_id,
        public_id: existing.public_id,
        is_public: existing.is_public,
        weak_areas: existing.weak_areas as unknown as WeakArea[],
        summary_text: existing.summary_text,
        matched_resources: existing.matched_resources as unknown as MatchedResourcesIndex,
        attempts_count: existing.attempts_count,
        language: existing.language as Locale,
        generated_at: existing.generated_at,
      }
    }
  }

  return generateAndStoreSnapshot(userId)
}
