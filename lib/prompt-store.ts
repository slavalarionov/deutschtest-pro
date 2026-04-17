// server-only — this file must NEVER be imported in client components.
// Источник правды для системных промптов: БД → fallback в файлах prompts/.
//
// Поведение:
// - Читает активную версию промпта (prompts.active_version_id → prompt_versions.content).
// - In-memory кеш 60 секунд по ключу — чтобы не бить БД на каждый вызов Claude.
// - Если БД упала, ключа нет, или active_version_id NULL — возвращает переданный
//   fallback-шаблон (обычно константа из самого файла промпта).
// - Fallback кешируется на короткий срок (5 секунд), чтобы не долбить БД в шторм,
//   но быстро подхватить исправление после сидера.

import { createAdminClient } from '@/lib/supabase/admin'

const DB_TTL_MS = 60_000
const FALLBACK_TTL_MS = 5_000

interface CacheEntry {
  value: string
  expires: number
}

const cache = new Map<string, CacheEntry>()

/**
 * Возвращает актуальный текст промпта по ключу.
 * Если БД недоступна или ключа нет — возвращает переданный fallback-шаблон.
 *
 * Промпт-шаблоны могут содержать плейсхолдеры вида {level}, {topic_situation}.
 * Подстановка — ответственность вызывающего кода (обычно build<Xxx>Prompt).
 */
export async function getPrompt(key: string, fallback: string): Promise<string> {
  const now = Date.now()
  const cached = cache.get(key)
  if (cached && cached.expires > now) return cached.value

  try {
    const supabase = createAdminClient()
    const { data: promptRow, error: promptErr } = await supabase
      .from('prompts')
      .select('active_version_id')
      .eq('key', key)
      .maybeSingle()

    if (!promptErr && promptRow?.active_version_id) {
      const { data: versionRow, error: versionErr } = await supabase
        .from('prompt_versions')
        .select('content')
        .eq('id', promptRow.active_version_id)
        .maybeSingle()

      if (!versionErr && versionRow?.content) {
        cache.set(key, { value: versionRow.content, expires: now + DB_TTL_MS })
        return versionRow.content
      }
    }
  } catch (e) {
    console.error(`[prompt-store] DB read failed for "${key}":`, e instanceof Error ? e.message : e)
  }

  cache.set(key, { value: fallback, expires: now + FALLBACK_TTL_MS })
  return fallback
}

/** Для тестов и административных ручек — инвалидирует кеш конкретного ключа. */
export function invalidatePromptCache(key?: string): void {
  if (key) cache.delete(key)
  else cache.clear()
}
