// Dry-run smoke-тест подстановки уровне-зависимых плейсхолдеров в Schreiben.
// Запуск: npx tsx scripts/smoke-test-schreiben-placeholders.ts
//
// Использует реальный шаблон из БД через getPrompt, подставляет fake TopicData
// и проверяет, что промпт для A1 НЕ содержит «3–4 Inhaltspunkte», а B1 содержит
// «3 Inhaltspunkte» и разрешение Sie-Form.

import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import { buildSchreibenPrompt } from '../prompts/generation/schreiben'
import type { TopicData } from '../lib/topic-sampler'

const FAKE_TOPIC: TopicData = {
  situation: 'Einladung zu einer Geburtstagsfeier',
  recipient: 'Freund Klaus',
  sceneHint: null,
  category: null,
  taskHints: [],
  examples: [],
}

async function run() {
  const a1 = await buildSchreibenPrompt('A1', FAKE_TOPIC)
  const a2 = await buildSchreibenPrompt('A2', FAKE_TOPIC)
  const b1 = await buildSchreibenPrompt('B1', FAKE_TOPIC)

  console.log('=== A1 ===')
  console.log(a1)
  console.log('\n=== A2 ===')
  console.log(a2)
  console.log('\n=== B1 ===')
  console.log(b1)

  console.log('\n\n=== ASSERTIONS ===')

  const checks: Array<[string, boolean]> = [
    ['A1: no verbatim "3–4 Inhaltspunkte"', !a1.includes('3–4 Inhaltspunkte')],
    ['A1: contains informal Orientierungshinweis', a1.includes('informeller Orientierungshinweis')],
    ['A1: register uses "du"', a1.includes('informell mit "du"')],
    ['A2: 3 Leitpunkte', a2.includes('3 Leitpunkte')],
    ['B1: 3 Inhaltspunkte as numbered list', b1.includes('3 Inhaltspunkte (als nummerierte Liste')],
    ['B1: Sie-formal allowed', b1.includes('formell (Sie)')],
    ['A1 word count 30', a1.includes('ca. 30 Wörter')],
    ['B1 word count 80', b1.includes('ca. 80 Wörter')],
    ['No unresolved placeholders in A1', !/\{\w+\}/.test(a1)],
    ['No unresolved placeholders in B1', !/\{\w+\}/.test(b1)],
  ]

  let failed = 0
  for (const [label, passed] of checks) {
    console.log(`${passed ? '✅' : '❌'} ${label}`)
    if (!passed) failed++
  }

  if (failed > 0) {
    console.error(`\n${failed} assertion(s) failed.`)
    process.exit(1)
  }

  console.log('\nAll checks passed.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
