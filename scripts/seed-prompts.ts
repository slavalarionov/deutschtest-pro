// scripts/seed-prompts.ts
//
// Сидер: читает FALLBACK_TEMPLATE из файлов prompts/generation/*
// и prompts/scoring/*, синхронизирует с БД.
//
// Поведение:
// 1. Если записи в prompts нет — создаёт её и пишет v1 (initial seed).
// 2. Если запись есть и active-версия совпадает с файлом по content — skip.
// 3. Если запись есть и content отличается — создаёт новую версию
//    (version = max(version)+1), проставляет active_version_id, change_note
//    задаётся через ENTRY.changeNote (или дефолт).
//
// Запуск (требует tsx и заполненный .env.local):
//   npx tsx scripts/seed-prompts.ts

import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

import {
  PROMPT_KEY as LESEN_T1_KEY,
  FALLBACK_TEMPLATE as LESEN_T1_TPL,
} from '../prompts/generation/lesen-teil1'
import {
  PROMPT_KEY as LESEN_T2_KEY,
  FALLBACK_TEMPLATE as LESEN_T2_TPL,
} from '../prompts/generation/lesen-teil2'
import {
  PROMPT_KEY as LESEN_T3_KEY,
  FALLBACK_TEMPLATE as LESEN_T3_TPL,
} from '../prompts/generation/lesen-teil3'
import {
  PROMPT_KEY as LESEN_T4_KEY,
  FALLBACK_TEMPLATE as LESEN_T4_TPL,
} from '../prompts/generation/lesen-teil4'
import {
  PROMPT_KEY as LESEN_T5_KEY,
  FALLBACK_TEMPLATE as LESEN_T5_TPL,
} from '../prompts/generation/lesen-teil5'
import {
  PROMPT_KEY as HOREN_T1_KEY,
  FALLBACK_TEMPLATE as HOREN_T1_TPL,
} from '../prompts/generation/horen-teil1'
import {
  PROMPT_KEY as HOREN_T2_KEY,
  FALLBACK_TEMPLATE as HOREN_T2_TPL,
} from '../prompts/generation/horen-teil2'
import {
  PROMPT_KEY as HOREN_T3_KEY,
  FALLBACK_TEMPLATE as HOREN_T3_TPL,
} from '../prompts/generation/horen-teil3'
import {
  PROMPT_KEY as HOREN_T4_KEY,
  FALLBACK_TEMPLATE as HOREN_T4_TPL,
} from '../prompts/generation/horen-teil4'
import {
  PROMPT_KEY as SCHREIBEN_KEY,
  FALLBACK_TEMPLATE as SCHREIBEN_TPL,
} from '../prompts/generation/schreiben'
import {
  PROMPT_KEY as SPRECHEN_KEY,
  FALLBACK_TEMPLATE as SPRECHEN_TPL,
} from '../prompts/generation/sprechen'
import {
  PROMPT_KEY as SCHREIBEN_SCORE_KEY,
  FALLBACK_TEMPLATE as SCHREIBEN_SCORE_TPL,
} from '../prompts/scoring/schreiben-score'
import {
  PROMPT_KEY as SPRECHEN_SCORE_KEY,
  FALLBACK_TEMPLATE as SPRECHEN_SCORE_TPL,
} from '../prompts/scoring/sprechen-score'

interface SeedEntry {
  key: string
  template: string
  description: string
  changeNote?: string
}

const DEFAULT_CHANGE_NOTE = 'Fix: level-dependent constants replaced with placeholders'

const ENTRIES: SeedEntry[] = [
  { key: LESEN_T1_KEY, template: LESEN_T1_TPL, description: 'Lesen Teil 1 — Blogtext + richtig/falsch' },
  { key: LESEN_T2_KEY, template: LESEN_T2_TPL, description: 'Lesen Teil 2 — Zeitungsartikel + Multiple Choice' },
  { key: LESEN_T3_KEY, template: LESEN_T3_TPL, description: 'Lesen Teil 3 — Regeltext + ja/nein' },
  { key: LESEN_T4_KEY, template: LESEN_T4_TPL, description: 'Lesen Teil 4 — Kleinanzeigen + Zuordnung' },
  { key: LESEN_T5_KEY, template: LESEN_T5_TPL, description: 'Lesen Teil 5 — Lückentext' },
  { key: HOREN_T1_KEY, template: HOREN_T1_TPL, description: 'Hören Teil 1 — Mono-Durchsagen' },
  { key: HOREN_T2_KEY, template: HOREN_T2_TPL, description: 'Hören Teil 2 — Alltagsdialog mit 5 Szenen' },
  { key: HOREN_T3_KEY, template: HOREN_T3_TPL, description: 'Hören Teil 3 — Interview' },
  { key: HOREN_T4_KEY, template: HOREN_T4_TPL, description: 'Hören Teil 4 — 5 kurze getrennte Dialoge' },
  { key: SCHREIBEN_KEY, template: SCHREIBEN_TPL, description: 'Schreiben — Email/Brief Generation' },
  { key: SPRECHEN_KEY, template: SPRECHEN_TPL, description: 'Sprechen — Planning/Presentation/Reaction' },
  { key: SCHREIBEN_SCORE_KEY, template: SCHREIBEN_SCORE_TPL, description: 'Schreiben — Scoring (Goethe-Kriterien)' },
  { key: SPRECHEN_SCORE_KEY, template: SPRECHEN_SCORE_TPL, description: 'Sprechen — Scoring (Goethe-Kriterien)' },
]

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
  let updated = 0
  let skipped = 0

  for (const entry of ENTRIES) {
    const category = entry.key.split('/')[0]

    const { data: existing, error: existingErr } = await supabase
      .from('prompts')
      .select('key, active_version_id')
      .eq('key', entry.key)
      .maybeSingle()

    if (existingErr) {
      console.error(`[${entry.key}] lookup failed:`, existingErr.message)
      continue
    }

    // Если есть активная версия — сравним её content с файлом.
    if (existing?.active_version_id) {
      const { data: activeVersion, error: activeErr } = await supabase
        .from('prompt_versions')
        .select('content, version')
        .eq('id', existing.active_version_id)
        .maybeSingle()

      if (activeErr) {
        console.error(`[${entry.key}] active version lookup failed:`, activeErr.message)
        continue
      }

      if (activeVersion?.content === entry.template) {
        console.log(`⏭  ${entry.key} — up to date (v${activeVersion.version})`)
        skipped++
        continue
      }

      // Content отличается → создаём новую версию.
      const { data: maxRow } = await supabase
        .from('prompt_versions')
        .select('version')
        .eq('prompt_key', entry.key)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle()

      const nextVersion = (maxRow?.version ?? 0) + 1

      const { data: newVersion, error: insertErr } = await supabase
        .from('prompt_versions')
        .insert({
          prompt_key: entry.key,
          version: nextVersion,
          content: entry.template,
          change_note: entry.changeNote ?? DEFAULT_CHANGE_NOTE,
        })
        .select('id')
        .single()

      if (insertErr || !newVersion) {
        console.error(`[${entry.key}] new version insert failed:`, insertErr?.message)
        continue
      }

      const { error: promoteErr } = await supabase
        .from('prompts')
        .update({ active_version_id: newVersion.id, updated_at: new Date().toISOString() })
        .eq('key', entry.key)

      if (promoteErr) {
        console.error(`[${entry.key}] activate new version failed:`, promoteErr.message)
        continue
      }

      console.log(`🔄 ${entry.key} — updated to v${nextVersion} (id=${newVersion.id})`)
      updated++
      continue
    }

    // Нет записи или нет активной версии — первичный сид.
    const { error: promptErr } = await supabase
      .from('prompts')
      .upsert({
        key: entry.key,
        category,
        description: entry.description,
        updated_at: new Date().toISOString(),
      })

    if (promptErr) {
      console.error(`[${entry.key}] prompts upsert failed:`, promptErr.message)
      continue
    }

    const { data: version, error: versionErr } = await supabase
      .from('prompt_versions')
      .insert({
        prompt_key: entry.key,
        version: 1,
        content: entry.template,
        change_note: 'Initial seed from file',
      })
      .select('id')
      .single()

    if (versionErr || !version) {
      console.error(`[${entry.key}] prompt_versions insert failed:`, versionErr?.message)
      continue
    }

    const { error: updateErr } = await supabase
      .from('prompts')
      .update({ active_version_id: version.id })
      .eq('key', entry.key)

    if (updateErr) {
      console.error(`[${entry.key}] prompts.active_version_id update failed:`, updateErr.message)
      continue
    }

    console.log(`✅ ${entry.key} — seeded v1 (id=${version.id})`)
    inserted++
  }

  console.log(
    `\nDone. Inserted: ${inserted}, updated: ${updated}, skipped (unchanged): ${skipped}, total: ${ENTRIES.length}`,
  )
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
