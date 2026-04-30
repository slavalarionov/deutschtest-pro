#!/usr/bin/env node
/**
 * Reads tasks/learning-advice-70-items.md, parses the 70 source advice blocks,
 * validates each body JSON against the same schema as types/learning-advice.ts,
 * applies multi-module duplication rules, and emits two migrations:
 *
 *   - supabase/migrations/035_seed_learning_advice.sql   — canonical seed for
 *     clean DB setup (INSERT-only, no DELETE)
 *   - supabase/migrations/036_reseed_learning_advice.sql — upgrade for envs
 *     where 035 was already applied with the previous single-mapping data
 *     (DELETE FROM ... WHERE resource_type='advice' + INSERT)
 *
 * Re-run after editing the source markdown:
 *   node scripts/build-learning-advice-migration.mjs
 */

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = join(__dirname, '..')
const SOURCE_MD = join(REPO_ROOT, 'tasks/learning-advice-70-items.md')
const SEED_SQL = join(REPO_ROOT, 'supabase/migrations/035_seed_learning_advice.sql')
const RESEED_SQL = join(REPO_ROOT, 'supabase/migrations/036_reseed_learning_advice.sql')

const VALID_MODULES = new Set(['lesen', 'horen', 'schreiben', 'sprechen', 'general'])
const VALID_LEVELS = new Set(['a1', 'a2', 'b1'])
const VALID_TOPICS = new Set([
  'modal-verben',
  'perfekt',
  'prateritum',
  'konjunktiv',
  'prapositionen',
  'cases',
  'briefe',
  'inhaltspunkte',
  'wortschatz',
  'aussprache',
  'dialoge',
  'texts-reading',
  'audio-listening',
  'general',
])

const TARGET_MODULES = new Set(['lesen', 'horen', 'schreiben', 'sprechen'])

/**
 * Per-item duplication rules for cross-module advice. The SQL CHECK only
 * allows the four Goethe modules, so each source block listed here is fanned
 * out into one INSERT per module — same body/title/description, only `module`
 * differs. Reachability via the matcher (AND on module+level+topic) means
 * planning advice has to live under every module a user might be weak in.
 *
 * Topic of each generated record is taken from this rules map (overrides the
 * markdown header) so the source-of-truth for cross-module records is here,
 * not in the markdown header.
 *
 * 7 source blocks → 21 generated records:
 *   #22, #46, #67, #69 (study plans)             → 4 modules each = 16
 *   #23, #68 (vocabulary techniques)             → 2 modules each = 4
 *   #70 (Schreiben B1 letter checklist)          → 1 module       = 1
 *
 * Items not listed here use their markdown module/topic as-is (1 record each).
 */
const MULTI_MODULE_RULES = {
  22: { topic: 'general', modules: ['sprechen', 'schreiben', 'lesen', 'horen'] },
  23: { topic: 'wortschatz', modules: ['lesen', 'sprechen'] },
  46: { topic: 'general', modules: ['sprechen', 'schreiben', 'lesen', 'horen'] },
  67: { topic: 'general', modules: ['sprechen', 'schreiben', 'lesen', 'horen'] },
  68: { topic: 'wortschatz', modules: ['lesen', 'sprechen'] },
  69: { topic: 'general', modules: ['sprechen', 'schreiben', 'lesen', 'horen'] },
  70: { topic: 'briefe', modules: ['schreiben'] },
}

function parseBlocks(md) {
  const blocks = []
  const pieces = md.split(/^###\s+(\d+)\.\s+\(([^)]+)\)\s*$/m)
  for (let i = 1; i + 2 < pieces.length; i += 3) {
    const n = Number(pieces[i])
    const headerInner = pieces[i + 1].trim()
    const content = pieces[i + 2]

    const headerParts = headerInner.split(',').map((s) => s.trim())
    if (headerParts.length !== 3) {
      throw new Error(`Item #${n}: bad header "${headerInner}"`)
    }
    const [moduleRaw, level, topic] = headerParts

    if (!VALID_MODULES.has(moduleRaw)) {
      throw new Error(`Item #${n}: unknown module "${moduleRaw}"`)
    }
    if (!VALID_LEVELS.has(level)) {
      throw new Error(`Item #${n}: unknown level "${level}"`)
    }
    if (!VALID_TOPICS.has(topic)) {
      throw new Error(`Item #${n}: unknown topic "${topic}"`)
    }

    const titleMatch = content.match(/\*\*title:\*\*\s*(.+?)\s*\n/)
    if (!titleMatch) throw new Error(`Item #${n}: title not found`)
    const title = titleMatch[1].trim()

    const descMatch = content.match(/\*\*description:\*\*\s*(.+?)\s*\n/)
    if (!descMatch) throw new Error(`Item #${n}: description not found`)
    const description = descMatch[1].trim()

    const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/)
    if (!jsonMatch) throw new Error(`Item #${n}: body json fence not found`)

    let body
    try {
      body = JSON.parse(jsonMatch[1])
    } catch (e) {
      throw new Error(`Item #${n}: body JSON parse error — ${e.message}`)
    }

    validateBody(n, body)

    blocks.push({ n, sourceModule: moduleRaw, sourceTopic: topic, level, title, description, body })
  }
  return blocks
}

function validateBody(n, body) {
  if (!body || typeof body !== 'object') {
    throw new Error(`Item #${n}: body is not an object`)
  }
  const required = ['why', 'steps', 'drill', 'avoid', 'progress']
  for (const k of required) {
    if (!(k in body)) throw new Error(`Item #${n}: body.${k} missing`)
  }
  if (typeof body.why !== 'string' || body.why.length < 50) {
    throw new Error(`Item #${n}: body.why too short (${body.why?.length ?? 0} chars)`)
  }
  if (!Array.isArray(body.steps)) throw new Error(`Item #${n}: body.steps not array`)
  if (body.steps.length < 3 || body.steps.length > 6) {
    throw new Error(`Item #${n}: body.steps must be 3..6, got ${body.steps.length}`)
  }
  for (let i = 0; i < body.steps.length; i++) {
    const s = body.steps[i]
    if (typeof s !== 'string' || s.length < 20) {
      throw new Error(`Item #${n}: body.steps[${i}] too short`)
    }
  }
  if (typeof body.drill !== 'string' || body.drill.length < 50) {
    throw new Error(`Item #${n}: body.drill too short`)
  }
  if (typeof body.avoid !== 'string' || body.avoid.length < 30) {
    throw new Error(`Item #${n}: body.avoid too short`)
  }
  if (typeof body.progress !== 'string' || body.progress.length < 30) {
    throw new Error(`Item #${n}: body.progress too short`)
  }
  const extra = Object.keys(body).filter((k) => !required.includes(k))
  if (extra.length > 0) {
    throw new Error(`Item #${n}: body has unexpected keys: ${extra.join(', ')}`)
  }
}

/**
 * Expands parsed source blocks into final records with concrete (module, topic)
 * pairs the SQL CHECK accepts. Items with multi-module rules become several
 * records; items without rules pass through unchanged.
 */
function expandRecords(blocks) {
  const records = []
  for (const b of blocks) {
    const rule = MULTI_MODULE_RULES[b.n]
    if (rule) {
      for (const module of rule.modules) {
        if (!TARGET_MODULES.has(module)) {
          throw new Error(`Item #${b.n}: rule module "${module}" not allowed`)
        }
        records.push({
          n: b.n,
          module,
          level: b.level,
          topic: rule.topic,
          title: b.title,
          description: b.description,
          body: b.body,
        })
      }
    } else {
      if (!TARGET_MODULES.has(b.sourceModule)) {
        throw new Error(
          `Item #${b.n}: source module "${b.sourceModule}" needs a MULTI_MODULE_RULES entry`,
        )
      }
      records.push({
        n: b.n,
        module: b.sourceModule,
        level: b.level,
        topic: b.sourceTopic,
        title: b.title,
        description: b.description,
        body: b.body,
      })
    }
  }
  return records
}

function dollarQuote(s) {
  for (let i = 0; i < 100; i++) {
    const tag = i === 0 ? '$body$' : `$body${i}$`
    if (!s.includes(tag)) return tag + s + tag
  }
  throw new Error('Could not find safe dollar-quote tag')
}

function quoteSqlText(s) {
  return "'" + s.replace(/'/g, "''") + "'"
}

function buildValueRows(records) {
  return records.map((r, i) => {
    const last = i === records.length - 1
    const bodyJson = JSON.stringify(r.body)
    return `  ( ${quoteSqlText(r.module)}, ${quoteSqlText(r.level)}, ${quoteSqlText(r.topic)}, 'ru', 'advice', true,
    ${quoteSqlText(r.title)},
    ${quoteSqlText(r.description)},
    ${dollarQuote(bodyJson)}::jsonb )${last ? ';' : ','}`
  })
}

function buildSeedSql(records) {
  const lines = []
  lines.push('-- 035_seed_learning_advice.sql')
  lines.push('--')
  lines.push(`-- Seeds ${records.length} curated learning advice items into learning_resources.`)
  lines.push('-- Generated from tasks/learning-advice-70-items.md by')
  lines.push('-- scripts/build-learning-advice-migration.mjs — do not edit by hand.')
  lines.push('--')
  lines.push('-- Note: 7 source blocks expand into 21 records via MULTI_MODULE_RULES so that')
  lines.push('-- cross-module planning/vocabulary advice is reachable for any module weakness.')
  lines.push('')
  lines.push('BEGIN;')
  lines.push('')
  lines.push('INSERT INTO public.learning_resources')
  lines.push('  (module, level, topic, language, resource_type, is_active, title, description, body)')
  lines.push('VALUES')
  lines.push(...buildValueRows(records))
  lines.push('')
  lines.push('COMMIT;')
  lines.push('')
  lines.push("NOTIFY pgrst, 'reload schema';")
  lines.push('')
  return lines.join('\n')
}

function buildReseedSql(records) {
  const lines = []
  lines.push('-- 036_reseed_learning_advice.sql')
  lines.push('--')
  lines.push(`-- Wipes existing advice rows and reseeds with ${records.length} records.`)
  lines.push('-- Apply on environments where 035 was already run with the previous')
  lines.push('-- single-mapping (70-record) data, to upgrade them to the multi-module')
  lines.push('-- duplication scheme (84 records). Generated by')
  lines.push('-- scripts/build-learning-advice-migration.mjs — do not edit by hand.')
  lines.push('')
  lines.push('BEGIN;')
  lines.push('')
  lines.push("DELETE FROM public.learning_resources WHERE resource_type = 'advice';")
  lines.push('')
  lines.push('INSERT INTO public.learning_resources')
  lines.push('  (module, level, topic, language, resource_type, is_active, title, description, body)')
  lines.push('VALUES')
  lines.push(...buildValueRows(records))
  lines.push('')
  lines.push('COMMIT;')
  lines.push('')
  lines.push("NOTIFY pgrst, 'reload schema';")
  lines.push('')
  return lines.join('\n')
}

async function main() {
  const md = await readFile(SOURCE_MD, 'utf8')
  const blocks = parseBlocks(md)

  if (blocks.length !== 70) {
    throw new Error(`Expected 70 source blocks, parsed ${blocks.length}`)
  }

  const records = expandRecords(blocks)

  const byLevel = {}
  const byModule = {}
  const byTopic = {}
  for (const r of records) {
    byLevel[r.level] = (byLevel[r.level] ?? 0) + 1
    byModule[r.module] = (byModule[r.module] ?? 0) + 1
    byTopic[r.topic] = (byTopic[r.topic] ?? 0) + 1
  }

  await writeFile(SEED_SQL, buildSeedSql(records), 'utf8')
  await writeFile(RESEED_SQL, buildReseedSql(records), 'utf8')

  console.log(`Wrote ${SEED_SQL}`)
  console.log(`Wrote ${RESEED_SQL}`)
  console.log(`Source blocks: ${blocks.length}`)
  console.log(`Generated records: ${records.length}`)
  console.log('By level:', byLevel)
  console.log('By module:', byModule)
  console.log('By topic:', byTopic)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
