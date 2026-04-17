// server-only — this file must NEVER be imported in client components.
// Тематический sampler для генерации. Решает проблему «Claude выдаёт одинаковые тесты»:
// при каждой генерации случайно выбирается одна активная строка из generation_topics
// и подставляется в промпт.
//
// Поведение:
// - Читает активные темы из таблицы generation_topics через service role.
// - In-memory кеш 5 минут на ключ `${module}:${level}:${teil ?? 'null'}`.
// - Fallback: если БД недоступна или тем нет, использует хардкод из
//   `prompts/generation/_topic-fallbacks.ts` (минимум 3 темы на ключ).
// - Случайный выбор через Math.random (не криптоcaseful — достаточно для sampler'а).

import { createAdminClient } from '@/lib/supabase/admin'
import { FALLBACK_TOPICS } from '@/prompts/generation/_topic-fallbacks'

export type ExamLevelLower = 'a1' | 'a2' | 'b1'
export type ModuleName = 'lesen' | 'horen' | 'schreiben' | 'sprechen'

/** JSON-шейп темы. Поля зависят от модуля/teil; все опциональные, чтобы не падать на расхождениях. */
export interface TopicData {
  situation?: string
  recipient?: string
  taskHints?: string[]
  category?: string
  tone?: string
  sceneHint?: string
  taskType?: string
  [extra: string]: unknown
}

export interface SamplerKey {
  module: ModuleName
  level: ExamLevelLower
  teil?: number
}

const TTL_MS = 5 * 60_000

interface CacheEntry {
  topics: TopicData[]
  expires: number
}

const cache = new Map<string, CacheEntry>()

export function topicCacheKey(p: SamplerKey): string {
  return `${p.module}:${p.level}:${p.teil ?? 'null'}`
}

async function loadTopics(params: SamplerKey): Promise<TopicData[]> {
  const key = topicCacheKey(params)
  try {
    const supabase = createAdminClient()
    let query = supabase
      .from('generation_topics')
      .select('topic_data')
      .eq('module', params.module)
      .eq('level', params.level)
      .eq('is_active', true)
    query = params.teil == null ? query.is('teil', null) : query.eq('teil', params.teil)

    const { data, error } = await query
    if (!error && data && data.length > 0) {
      return data.map((r) => r.topic_data as TopicData)
    }
  } catch (e) {
    console.error(
      `[topic-sampler] DB read failed for ${key}:`,
      e instanceof Error ? e.message : e
    )
  }
  return FALLBACK_TOPICS[key] ?? []
}

/**
 * Возвращает одну случайно выбранную активную тему для заданного module+level+teil.
 * Если ни в БД, ни в fallback тем нет — возвращает пустой объект (вызывающий код
 * использует дефолтные значения плейсхолдеров).
 */
export async function pickRandomTopic(params: SamplerKey): Promise<TopicData> {
  const key = topicCacheKey(params)
  const now = Date.now()
  const cached = cache.get(key)
  let topics: TopicData[]
  if (cached && cached.expires > now) {
    topics = cached.topics
  } else {
    topics = await loadTopics(params)
    cache.set(key, { topics, expires: now + TTL_MS })
  }
  if (topics.length === 0) return {}
  return topics[Math.floor(Math.random() * topics.length)]
}

/** Для админских операций: сбросить кеш после редактирования тем. */
export function invalidateTopicCache(params?: SamplerKey): void {
  if (params) cache.delete(topicCacheKey(params))
  else cache.clear()
}

/** Утилита для админского превью: вернуть все темы (учитывая кеш). */
export async function listTopicsForPreview(params: SamplerKey): Promise<TopicData[]> {
  const now = Date.now()
  const cached = cache.get(topicCacheKey(params))
  if (cached && cached.expires > now) return cached.topics
  const topics = await loadTopics(params)
  cache.set(topicCacheKey(params), { topics, expires: now + TTL_MS })
  return topics
}
