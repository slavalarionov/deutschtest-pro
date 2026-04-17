// scripts/seed-generation-topics.ts
//
// Разовый сидер стартовых тем для generation_topics.
// Источник — FALLBACK_TOPICS из prompts/generation/_topic-fallbacks.ts.
// Идемпотентность: пропускает связки module+level+teil, в которых уже есть
// хотя бы одна активная тема (считаем, что таблица уже наполнена).
//
// Запуск:
//   npx tsx scripts/seed-generation-topics.ts

import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

import { FALLBACK_TOPICS } from '../prompts/generation/_topic-fallbacks'

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

  let inserted = 0
  let skippedKeys = 0

  for (const [cacheKey, topics] of Object.entries(FALLBACK_TOPICS)) {
    const [module, level, teilRaw] = cacheKey.split(':')
    const teil = teilRaw === 'null' ? null : Number(teilRaw)

    let countQuery = supabase
      .from('generation_topics')
      .select('id', { count: 'exact', head: true })
      .eq('module', module)
      .eq('level', level)
      .eq('is_active', true)
    countQuery = teil == null ? countQuery.is('teil', null) : countQuery.eq('teil', teil)

    const { count, error: countErr } = await countQuery
    if (countErr) {
      console.error(`[${cacheKey}] count failed:`, countErr.message)
      continue
    }

    if ((count ?? 0) > 0) {
      console.log(`⏭  ${cacheKey} — already has ${count} topic(s), skipping`)
      skippedKeys++
      continue
    }

    const rows = topics.map((t) => ({
      module,
      level,
      teil,
      topic_data: t,
      is_active: true,
    }))

    const { error: insertErr } = await supabase.from('generation_topics').insert(rows)
    if (insertErr) {
      console.error(`[${cacheKey}] insert failed:`, insertErr.message)
      continue
    }

    console.log(`✅ ${cacheKey} — inserted ${rows.length} topic(s)`)
    inserted += rows.length
  }

  console.log(`\nDone. Inserted: ${inserted} rows. Skipped keys (already populated): ${skippedKeys}.`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
