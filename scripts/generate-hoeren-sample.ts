// scripts/generate-hoeren-sample.ts
//
// One-shot generator for the Hören sample played in components/landing/ModulesDetailSection.tsx
// (the interactive player on the right side of the Hören block on the landing).
//
// Reuses the SAME TTS pipeline + voice config as the real Hören module (lib/elevenlabs.ts +
// lib/voices.ts), so what users hear on the landing matches what they hear on the exam.
//
// Idempotent: re-running generates a fresh MP3 and overwrites the file in the
// `landing-assets` bucket via upsert: true. The Storage URL stays the same.
//
// Run:
//   npx tsx scripts/generate-hoeren-sample.ts
//
// Required env (.env.local):
//   ELEVENLABS_API_KEY            — TTS provider key (or proxy)
//   ELEVENLABS_API_URL_OVERRIDE   — optional Cloudflare Worker proxy URL
//   ELEVENLABS_PROXY_SECRET       — required when override is set
//   NEXT_PUBLIC_SUPABASE_URL      — Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY     — service role (bypasses RLS for the upload)

import { config as loadEnv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

loadEnv({ path: '.env.local' })

import { generateDialogue, type DialogueTtsLine } from '../lib/elevenlabs'

const BUCKET = 'landing-assets'
const FILE_PATH = 'hoeren-sample-b1.mp3'

// B1 dialogue — café scene, two casual speakers. Matches Hören Teil 2 format
// ("zwei Personen unterhalten sich"). Length target: 18–22 seconds at speed 0.9.
//
// Closure arc: recommendation → choice → action ("Bedienung rufen") so the
// 18-second clip feels like a complete fragment, not a cut-off mid-sentence.
const DIALOGUE: DialogueTtsLine[] = [
  {
    role: 'casual_female', // Anna
    text: 'Hallo Markus! Setz dich, ich habe einen Tisch am Fenster gefunden.',
  },
  {
    role: 'casual_male', // Markus
    text: 'Super, danke! Ist es hier immer so voll?',
  },
  {
    role: 'casual_female',
    text: 'Nur am Wochenende. Unter der Woche ist es ruhig.',
  },
  {
    role: 'casual_male',
    text: 'Verstehe. Und was empfiehlst du — Kuchen oder etwas Salziges?',
  },
  {
    role: 'casual_female',
    text: 'Probier den Apfelkuchen. Der ist hausgemacht, wirklich der beste in der Stadt.',
  },
  {
    role: 'casual_male',
    text: 'Klingt gut. Dann nehme ich ein Stück Apfelkuchen und einen Kaffee, bitte.',
  },
  {
    role: 'casual_female',
    text: 'Gute Wahl. Ich rufe die Bedienung.',
  },
]

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env.local',
    )
  }
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is missing in .env.local')
  }

  console.log(`[generate-hoeren-sample] Synthesising ${DIALOGUE.length} lines via ElevenLabs…`)
  const startedAt = Date.now()

  const buffer = await generateDialogue(DIALOGUE)
  const elapsed = Date.now() - startedAt
  console.log(
    `[generate-hoeren-sample] TTS done in ${(elapsed / 1000).toFixed(1)}s. ` +
      `Buffer ${(buffer.byteLength / 1024).toFixed(1)} KB.`,
  )

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log(`[generate-hoeren-sample] Uploading to ${BUCKET}/${FILE_PATH} (upsert)…`)
  const { error } = await supabase.storage.from(BUCKET).upload(FILE_PATH, buffer, {
    contentType: 'audio/mpeg',
    upsert: true,
    cacheControl: '31536000', // 1 year — file is immutable per generation
  })

  if (error) {
    console.error('[generate-hoeren-sample] Upload failed:', error.message)
    process.exit(1)
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${FILE_PATH}`
  console.log(`[generate-hoeren-sample] ✓ Done. Public URL:\n  ${publicUrl}`)
}

main().catch((err) => {
  console.error('[generate-hoeren-sample] Fatal:', err)
  process.exit(1)
})
