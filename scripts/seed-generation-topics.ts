// scripts/seed-generation-topics.ts
//
// Сидер для generation_topics. Топ-ап до целевого количества тем на
// (module, level, teil). Дедуп по topic_data->>'situation'.
// Источники тем:
//   1) FALLBACK_TOPICS из prompts/generation/_topic-fallbacks.ts (минимальные 3)
//   2) TOPIC_SEEDS из scripts/topics/index.ts (продовые 60+)
//
// Запуск:
//   npx tsx scripts/seed-generation-topics.ts

import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

import type { TopicData } from '../lib/topic-sampler'
import { FALLBACK_TOPICS } from '../prompts/generation/_topic-fallbacks'
import { TOPIC_SEEDS } from './topics'

type GenerationTopicRow = {
  module: string
  level: string
  teil: number | null
  topic_data: TopicData
  is_active: boolean
}

function mergeSeeds(): Record<string, TopicData[]> {
  const merged: Record<string, TopicData[]> = {}
  const keys = new Set([...Object.keys(FALLBACK_TOPICS), ...Object.keys(TOPIC_SEEDS)])
  for (const key of keys) {
    const seen = new Set<string>()
    const out: TopicData[] = []
    for (const t of [...(TOPIC_SEEDS[key] ?? []), ...(FALLBACK_TOPICS[key] ?? [])]) {
      const sit = typeof t.situation === 'string' ? t.situation.trim() : ''
      if (!sit || seen.has(sit)) continue
      seen.add(sit)
      out.push(t)
    }
    merged[key] = out
  }
  return merged
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const seeds = mergeSeeds()

  let totalInserted = 0
  let totalCombos = 0
  const summary: Array<{ key: string; before: number; inserted: number; after: number }> = []

  for (const [cacheKey, topics] of Object.entries(seeds)) {
    const [module, level, teilRaw] = cacheKey.split(':')
    const teil = teilRaw === 'null' ? null : Number(teilRaw)

    let existingQuery = supabase
      .from('generation_topics')
      .select('topic_data')
      .eq('module', module)
      .eq('level', level)
      .eq('is_active', true)
    existingQuery = teil == null ? existingQuery.is('teil', null) : existingQuery.eq('teil', teil)

    const { data: existingRows, error: readErr } = await existingQuery
    if (readErr) {
      console.error(`[${cacheKey}] read failed:`, readErr.message)
      continue
    }

    const existingSituations = new Set<string>()
    for (const row of existingRows ?? []) {
      const data = row.topic_data as TopicData | null
      const sit = typeof data?.situation === 'string' ? data.situation.trim() : ''
      if (sit) existingSituations.add(sit)
    }
    const before = existingSituations.size

    const toInsert: GenerationTopicRow[] = []
    for (const t of topics) {
      const sit = typeof t.situation === 'string' ? t.situation.trim() : ''
      if (!sit) continue
      if (existingSituations.has(sit)) continue
      existingSituations.add(sit)
      toInsert.push({ module, level, teil, topic_data: t, is_active: true })
    }

    if (toInsert.length === 0) {
      console.log(`= ${cacheKey} — ${before} topics, nothing to add`)
      summary.push({ key: cacheKey, before, inserted: 0, after: before })
      totalCombos++
      continue
    }

    const { error: insertErr } = await supabase.from('generation_topics').insert(toInsert)
    if (insertErr) {
      console.error(`[${cacheKey}] insert failed:`, insertErr.message)
      continue
    }

    const after = before + toInsert.length
    console.log(`+ ${cacheKey} — +${toInsert.length} (${before} -> ${after})`)
    summary.push({ key: cacheKey, before, inserted: toInsert.length, after })
    totalInserted += toInsert.length
    totalCombos++
  }

  console.log(`\nDone. Inserted ${totalInserted} rows across ${totalCombos} combos.\n`)
  console.log('Final counts (combos below target 60 get a warning):')
  for (const { key, after } of summary.sort((a, b) => a.key.localeCompare(b.key))) {
    const warn = after < 60 ? '  ⚠ below 60' : ''
    console.log(`  ${key.padEnd(20)} ${String(after).padStart(4)}${warn}`)
  }
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
