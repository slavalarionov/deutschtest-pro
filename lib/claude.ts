// server-only — this file must NEVER be imported in client components
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { ExamLevel, LesenTeil1, LesenTeil4, LesenContent, SchreibenContent, SchreibenFeedback, SprechenFeedback, SprechenContent, HorenContent } from '@/types/exam'

import { getLesenTeil1Prompt } from '@/prompts/generation/lesen-teil1'
import { getLesenTeil2Prompt } from '@/prompts/generation/lesen-teil2'
import { getLesenTeil3Prompt } from '@/prompts/generation/lesen-teil3'
import { getLesenTeil4Prompt } from '@/prompts/generation/lesen-teil4'
import { getLesenTeil5Prompt } from '@/prompts/generation/lesen-teil5'
import { getHorenTeil1Prompt } from '@/prompts/generation/horen-teil1'
import { getHorenTeil2Prompt } from '@/prompts/generation/horen-teil2'
import { getHorenTeil3Prompt } from '@/prompts/generation/horen-teil3'
import { getHorenTeil4Prompt } from '@/prompts/generation/horen-teil4'
import { getSchreibenPrompt } from '@/prompts/generation/schreiben'
import { getSprechenPrompt } from '@/prompts/generation/sprechen'
import { getSchreibenScorePrompt } from '@/prompts/scoring/schreiben-score'
import { getSprechenScorePrompt } from '@/prompts/scoring/sprechen-score'
import { horenDialogueEmotionSchema, normalizeDialogueEmotion } from '@/lib/horen-emotion'
import { logAiUsage } from './ai-usage-logger'
import { calculateAnthropicCost } from './ai-pricing'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// --- Tool-based generation (the new way) ---

const TOOL_GEN_RETRIES = 3

interface GenerateWithToolOptions<T> {
  systemPrompt: string
  userPrompt: string
  toolName: string
  toolDescription: string
  schema: z.ZodType<T>
  maxTokens?: number
  operation?: 'claude_generate' | 'claude_score'
  /** Optional hook to defensively normalize the raw tool input before Zod parsing. */
  normalizeInput?: (raw: unknown) => unknown
}

/**
 * Tool-use based structured generation (Anthropic tool_use + Zod).
 * The model is forced via tool_choice to call the provided tool. The tool's
 * input_schema is derived from the Zod schema; the model's output arrives
 * already parsed (as the tool_use block's `input`) and is additionally
 * validated against the same Zod schema for safety.
 */
export async function generateWithTool<T>(opts: GenerateWithToolOptions<T>): Promise<T> {
  const {
    systemPrompt,
    userPrompt,
    toolName,
    toolDescription,
    schema,
    maxTokens = 4096,
    operation = 'claude_generate',
    normalizeInput,
  } = opts

  const inputSchema = zodToJsonSchema(schema, {
    target: 'openAi',
    $refStrategy: 'none',
  }) as Record<string, unknown>

  let lastError: unknown

  for (let attempt = 1; attempt <= TOOL_GEN_RETRIES; attempt++) {
    let receivedInput: unknown | undefined
    try {
      if (attempt > 1) await sleep(2000 * (attempt - 1))

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: systemPrompt,
        tools: [
          {
            name: toolName,
            description: toolDescription,
            input_schema: inputSchema as Anthropic.Tool['input_schema'],
          },
        ],
        tool_choice: { type: 'tool', name: toolName },
        messages: [{ role: 'user', content: userPrompt }],
      })

      const cost = calculateAnthropicCost(
        message.model,
        message.usage.input_tokens,
        message.usage.output_tokens
      )
      logAiUsage({
        provider: 'anthropic',
        model: message.model,
        operation,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        costUsd: cost,
      }).catch(() => {})

      const toolUseBlock = message.content.find((b) => b.type === 'tool_use')
      if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
        throw new Error(`Model did not return a tool_use block (stop_reason: ${message.stop_reason})`)
      }

      receivedInput = toolUseBlock.input
      const normalized = normalizeInput ? normalizeInput(receivedInput) : receivedInput
      const validated = schema.parse(normalized)
      return validated
    } catch (err) {
      lastError = err
      const msg = err instanceof Error ? err.message : String(err)

      if (msg.includes('overloaded') || msg.includes('529')) {
        console.warn(`[generateWithTool] Claude overloaded, retry ${attempt}/${TOOL_GEN_RETRIES}...`)
        await sleep(5000 * attempt)
        continue
      }

      if (err instanceof z.ZodError) {
        console.error(
          '[generateWithTool] Zod validation failed on attempt',
          `${attempt}/${TOOL_GEN_RETRIES}:`,
          JSON.stringify(
            {
              toolName,
              issues: err.issues,
              receivedInput,
            },
            null,
            2
          )
        )
        continue
      }

      console.error(`[generateWithTool] attempt ${attempt}/${TOOL_GEN_RETRIES} failed:`, msg)
    }
  }

  throw lastError
}

// --- System prompts (tool use) ---

const SYSTEM_PROMPT_TOOL_GEN = `Du bist ein erfahrener Prüfungsautor für das Goethe-Zertifikat.
Du erstellst ausschließlich Aufgaben im offiziellen Prüfungsformat.
Verwende ausschließlich das bereitgestellte Tool, um deine Antwort zu strukturieren.
Achte besonders auf authentisches, natürliches Deutsch — typografische Anführungszeichen („…") sind erwünscht im Inhalt der Texte.`

const SYSTEM_PROMPT_TOOL_SCORE = `Du bist ein offizieller Prüfer für das Goethe-Zertifikat.
Du bewertest Antworten von Prüflingen fair, aber streng — wie ein echter Goethe-Prüfer.
Verwende ausschließlich das bereitgestellte Tool, um deine Bewertung zu strukturieren.`

// --- Zod schemas ---

const rfTaskSchema = z.object({
  id: z.number(),
  statement: z.string().min(5),
  answer: z.enum(['richtig', 'falsch']),
  isExample: z.boolean().optional(),
})

const jnTaskSchema = z.object({
  id: z.number(),
  statement: z.string().min(5),
  answer: z.enum(['ja', 'nein']),
  isExample: z.boolean().optional(),
})

const mcTaskSchema = z.object({
  id: z.number(),
  question: z.string().min(5),
  options: z.object({
    a: z.string().min(1),
    b: z.string().min(1),
    c: z.string().min(1),
  }),
  answer: z.enum(['a', 'b', 'c']),
  isExample: z.boolean().optional(),
})

const teil1Schema = z.object({
  text: z.string().min(100),
  tasks: z.array(rfTaskSchema).min(6).max(8),
})

const teil2Schema = z.object({
  text: z.string().min(100),
  tasks: z.array(mcTaskSchema).min(5).max(7),
})

const teil3Schema = z.object({
  text: z.string().min(100),
  tasks: z.array(jnTaskSchema).min(6).max(8),
})

const teil4Schema = z.object({
  texts: z.array(z.object({ id: z.string(), text: z.string().min(10) })).min(6).max(10),
  situations: z.array(z.object({
    id: z.number(),
    situation: z.string().min(10),
    answer: z.string(),
    isExample: z.boolean().optional(),
  })).min(7).max(11),
})

const teil5Schema = z.object({
  text: z.string().min(50),
  gaps: z.array(z.object({
    id: z.number(),
    options: z.object({
      a: z.string().min(1),
      b: z.string().min(1),
      c: z.string().min(1),
    }),
    answer: z.enum(['a', 'b', 'c']),
    isExample: z.boolean().optional(),
  })).min(5).max(8),
})

// --- Return types ---

export interface LesenWithAnswers {
  content: LesenContent
  answers: Record<string, string>
}

// --- Teil 1: Blog + richtig/falsch ---

// --- Teil 2: Zeitungsartikel + Multiple Choice ---

// --- Teil 3: Regeln/Anweisungen + ja/nein ---

// --- Teil 4: Kurztexte + Zuordnung ---

// --- Teil 5: Lückentext + a/b/c ---

// --- Generators ---

async function generateTeil1(level: ExamLevel) {
  const validated = await generateWithTool({
    systemPrompt: SYSTEM_PROMPT_TOOL_GEN,
    userPrompt: getLesenTeil1Prompt(level),
    toolName: 'submit_lesen_teil1',
    toolDescription: 'Liefert den Lesen-Teil-1-Inhalt: Blogtext plus Richtig/Falsch-Aufgaben.',
    schema: teil1Schema,
    maxTokens: 4096,
  })

  const answers: Record<string, string> = {}
  const tasks = validated.tasks.map((t) => {
    if (!t.isExample) answers[`t1_${t.id}`] = t.answer
    return { id: t.id, statement: t.statement, isExample: t.isExample, ...(t.isExample ? { answer: t.answer } : {}) }
  })

  return { content: { text: validated.text, tasks } as LesenTeil1, answers }
}

async function generateTeil2(level: ExamLevel) {
  const validated = await generateWithTool({
    systemPrompt: SYSTEM_PROMPT_TOOL_GEN,
    userPrompt: getLesenTeil2Prompt(level),
    toolName: 'submit_lesen_teil2',
    toolDescription: 'Liefert den Lesen-Teil-2-Inhalt: Zeitungsartikel plus Multiple-Choice-Aufgaben.',
    schema: teil2Schema,
    maxTokens: 4096,
  })

  const answers: Record<string, string> = {}
  const tasks = validated.tasks.map((t) => {
    if (!t.isExample) answers[`t2_${t.id}`] = t.answer
    return {
      id: t.id,
      question: t.question,
      options: t.options,
      isExample: t.isExample,
      ...(t.isExample ? { answer: t.answer } : {}),
    }
  })

  return { content: { text: validated.text, tasks }, answers }
}

async function generateTeil3(level: ExamLevel) {
  const validated = await generateWithTool({
    systemPrompt: SYSTEM_PROMPT_TOOL_GEN,
    userPrompt: getLesenTeil3Prompt(level),
    toolName: 'submit_lesen_teil3',
    toolDescription: 'Liefert den Lesen-Teil-3-Inhalt: Regeltext plus Ja/Nein-Aufgaben.',
    schema: teil3Schema,
    maxTokens: 4096,
  })

  const answers: Record<string, string> = {}
  const tasks = validated.tasks.map((t) => {
    if (!t.isExample) answers[`t3_${t.id}`] = t.answer
    return { id: t.id, statement: t.statement, isExample: t.isExample, ...(t.isExample ? { answer: t.answer } : {}) }
  })

  return { content: { text: validated.text, tasks }, answers }
}

async function generateTeil4(level: ExamLevel) {
  const validated = await generateWithTool({
    systemPrompt: SYSTEM_PROMPT_TOOL_GEN,
    userPrompt: getLesenTeil4Prompt(level),
    toolName: 'submit_lesen_teil4',
    toolDescription: 'Liefert den Lesen-Teil-4-Inhalt: Kurztexte mit IDs und Zuordnungssituationen.',
    schema: teil4Schema,
    maxTokens: 4096,
  })

  const answers: Record<string, string> = {}
  const situations = validated.situations.map((s) => {
    if (!s.isExample) answers[`t4_${s.id}`] = s.answer
    return { id: s.id, situation: s.situation, isExample: s.isExample, ...(s.isExample ? { answer: s.answer } : {}) }
  })

  return {
    content: {
      texts: validated.texts.map((t) => ({ id: Number(t.id) || t.id, text: t.text })),
      situations,
    } as unknown as LesenTeil4,
    answers,
  }
}

async function generateTeil5(level: ExamLevel) {
  const validated = await generateWithTool({
    systemPrompt: SYSTEM_PROMPT_TOOL_GEN,
    userPrompt: getLesenTeil5Prompt(level),
    toolName: 'submit_lesen_teil5',
    toolDescription: 'Liefert den Lesen-Teil-5-Inhalt: Lückentext plus Lücken mit je drei Optionen.',
    schema: teil5Schema,
    maxTokens: 4096,
  })

  const answers: Record<string, string> = {}
  const gaps = validated.gaps.map((g) => {
    if (!g.isExample) answers[`t5_${g.id}`] = g.answer
    return { id: g.id, options: g.options, isExample: g.isExample, ...(g.isExample ? { answer: g.answer } : {}) }
  })

  return { content: { text: validated.text, gaps }, answers }
}

// --- Full Lesen generation (all 5 Teile in parallel) ---

export async function generateLesenFull(level: ExamLevel): Promise<LesenWithAnswers> {
  const delay = 5000
  const [t1, t2, t3, t4, t5] = await Promise.all([
    generateTeil1(level),
    sleep(delay * 1).then(() => generateTeil2(level)),
    sleep(delay * 2).then(() => generateTeil3(level)),
    sleep(delay * 3).then(() => generateTeil4(level)),
    sleep(delay * 4).then(() => generateTeil5(level)),
  ])

  const allAnswers = { ...t1.answers, ...t2.answers, ...t3.answers, ...t4.answers, ...t5.answers }

  return {
    content: {
      teil1: t1.content,
      teil2: t2.content as LesenContent['teil2'],
      teil3: t3.content as LesenContent['teil3'],
      teil4: t4.content as LesenContent['teil4'],
      teil5: t5.content as LesenContent['teil5'],
    } as LesenContent,
    answers: allAnswers,
  }
}

// ====================================================================
// SCHREIBEN — Generation + Scoring
// ====================================================================

const schreibenEmailOrBriefTaskSchema = z.object({
  id: z.number(),
  type: z.enum(['email', 'brief']),
  situation: z.string().min(1),
  prompt: z.string().min(1),
  requiredPoints: z.array(z.string().min(1)).min(3).max(5),
  wordCount: z.number().int().min(20).max(200),
})

const schreibenForumTaskSchema = z.object({
  id: z.number(),
  type: z.literal('forum'),
  situation: z.string().min(1),
  prompt: z.string().min(1),
  samplePost: z.string().min(1),
  requiredPoints: z.array(z.string().min(1)).min(3).max(5),
  wordCount: z.number().int().min(20).max(200),
})

const schreibenTaskSchema = z.discriminatedUnion('type', [
  schreibenEmailOrBriefTaskSchema,
  schreibenForumTaskSchema,
])

const schreibenSchema = z.object({
  tasks: z.array(schreibenTaskSchema).min(1).max(2),
})

const schreibenFeedbackSchema = z.object({
  score: z.number().min(0).max(100),
  criteria: z.object({
    taskFulfillment: z.number().min(0).max(25),
    coherence: z.number().min(0).max(25),
    vocabulary: z.number().min(0).max(25),
    grammar: z.number().min(0).max(25),
  }),
  comment: z.string().min(10),
})


export interface SchreibenGenResult {
  content: SchreibenContent
}

export async function generateSchreiben(level: ExamLevel): Promise<SchreibenGenResult> {
  const validated = await generateWithTool({
    systemPrompt: SYSTEM_PROMPT_TOOL_GEN,
    userPrompt: getSchreibenPrompt(level),
    toolName: 'submit_schreiben_tasks',
    toolDescription: 'Reicht die Schreibaufgabe(n) für das Modul Schreiben ein.',
    schema: schreibenSchema,
    maxTokens: 2048,
  })

  return {
    content: {
      tasks: validated.tasks.map((t) => {
        const base = {
          id: t.id,
          type: t.type,
          situation: t.situation,
          prompt: t.prompt,
          requiredPoints: t.requiredPoints,
          wordCount: t.wordCount,
          context: t.type === 'forum' ? (t.samplePost ?? t.situation) : t.situation,
        }
        if (t.type === 'forum') {
          return { ...base, samplePost: t.samplePost }
        }
        return base
      }),
    },
  }
}


export async function scoreSchreiben(
  level: ExamLevel,
  task: string,
  requiredPoints: string[],
  userText: string
): Promise<SchreibenFeedback> {
  return generateWithTool({
    systemPrompt: SYSTEM_PROMPT_TOOL_SCORE,
    userPrompt: getSchreibenScorePrompt(level, task, requiredPoints, userText),
    toolName: 'submit_schreiben_score',
    toolDescription: 'Reicht die Bewertung des Schreiben-Textes nach Goethe-Kriterien ein.',
    schema: schreibenFeedbackSchema,
    maxTokens: 2048,
    operation: 'claude_score',
  })
}

// ====================================================================
// HÖREN — Generation
// ====================================================================

const horenRFTaskSchema = z.object({
  id: z.number(),
  type: z.literal('rf'),
  statement: z.string().min(5),
  answer: z.enum(['richtig', 'falsch']),
})

const horenMCTaskSchema = z.object({
  id: z.number(),
  type: z.literal('mc'),
  question: z.string().min(5),
  options: z.object({ a: z.string(), b: z.string(), c: z.string() }),
  answer: z.enum(['a', 'b', 'c']),
})

const horenVoiceRoleSchema = z.enum([
  'casual_female',
  'casual_male',
  'professional_female',
  'professional_male',
  'announcer',
  'elderly_female',
  'child',
])

const horenDialogueLineSchema = z.object({
  speaker: z.string().min(1),
  role: horenVoiceRoleSchema,
  text: z.string().min(1),
  emotion: horenDialogueEmotionSchema,
})

const horenTaskUnion = z.discriminatedUnion('type', [horenRFTaskSchema, horenMCTaskSchema])

const horenScriptMonoSchema = z.object({
  id: z.number(),
  playCount: z.number().min(1).max(2),
  mode: z.literal('mono'),
  script: z.string().min(10),
  voiceType: z.enum([
    'male_professional',
    'female_professional',
    'male_casual',
    'female_casual',
  ]),
  tasks: z.array(horenTaskUnion).min(1),
})

const horenScriptDialogueSchema = z.object({
  id: z.number(),
  playCount: z.number().min(1).max(2),
  mode: z.literal('dialogue'),
  dialogue: z.array(horenDialogueLineSchema).min(2),
  tasks: z.array(horenTaskUnion).min(1),
})

const horenScriptSchema = z.discriminatedUnion('mode', [
  horenScriptMonoSchema,
  horenScriptDialogueSchema,
])

const horenTeilSchema = z.object({
  scripts: z.array(horenScriptSchema).min(1),
})


export interface HorenWithAnswers {
  content: HorenContent
  answers: Record<string, string>
}

/**
 * Defensive normalizer for Hören tool input.
 * Claude occasionally returns array fields (scripts, dialogue, tasks) as
 * JSON strings instead of actual arrays. This function recursively coerces
 * those fields to arrays before Zod validation runs, preventing the
 * `invalid_type: expected array, received string` error (~75% failure rate).
 */
function normalizeHorenInput(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw
  const obj = raw as Record<string, unknown>

  // Claude sometimes opens a quote with „ (U+201E) but closes with ASCII " (U+0022).
  // When that broken pair lands inside a JSON-encoded string, JSON.parse fails
  // on the unescaped ASCII ". Replace the closing " with typographic " (U+201C)
  // so the JSON becomes parseable again.
  function repairGermanQuotes(s: string): string {
    return s.replace(/(„[^"„\\]*?)"/g, '$1\u201C')
  }

  function tryParseArray(val: unknown): unknown {
    if (Array.isArray(val)) return val
    if (typeof val !== 'string') return val
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) return parsed
    } catch { /* fall through to repair */ }
    const repaired = repairGermanQuotes(val)
    if (repaired !== val) {
      try {
        const parsed = JSON.parse(repaired)
        if (Array.isArray(parsed)) return parsed
      } catch { /* repair didn't help — leave as-is */ }
    }
    return val
  }

  const scripts = tryParseArray(obj.scripts)
  const normalizedScripts = Array.isArray(scripts)
    ? scripts.map((s: unknown) => {
        if (!s || typeof s !== 'object' || Array.isArray(s)) return s
        const script = s as Record<string, unknown>
        return {
          ...script,
          dialogue: tryParseArray(script.dialogue),
          tasks: tryParseArray(script.tasks),
        }
      })
    : scripts

  return { ...obj, scripts: normalizedScripts }
}

async function generateHorenTeil(
  level: ExamLevel,
  promptFn: (level: ExamLevel) => string,
  toolName: string,
  toolDescription: string
) {
  const validated = await generateWithTool({
    systemPrompt: SYSTEM_PROMPT_TOOL_GEN,
    userPrompt: promptFn(level),
    toolName,
    toolDescription,
    schema: horenTeilSchema,
    maxTokens: 4096,
    normalizeInput: normalizeHorenInput,
  })

  const answers: Record<string, string> = {}
  const scripts = validated.scripts.map((s) => {
    const tasks = s.tasks.map((t) => {
      answers[`h_${t.id}`] = t.answer
      if (t.type === 'rf') {
        return { id: t.id, type: 'rf' as const, statement: t.statement }
      }
      return { id: t.id, type: 'mc' as const, question: t.question, options: t.options }
    })

    if (s.mode === 'dialogue') {
      const normalizedDialogue = s.dialogue.map((line) => ({
        ...line,
        emotion: normalizeDialogueEmotion(line.emotion),
      }))
      return {
        id: s.id,
        playCount: s.playCount,
        dialogue: normalizedDialogue,
        tasks,
      }
    }

    return {
      id: s.id,
      playCount: s.playCount,
      script: s.script,
      voiceType: s.voiceType,
      tasks,
    }
  })

  return { content: { scripts }, answers }
}

export async function generateHorenFull(level: ExamLevel): Promise<HorenWithAnswers> {
  const delay = 5000
  const [t1, t2, t3, t4] = await Promise.all([
    generateHorenTeil(
      level,
      getHorenTeil1Prompt,
      'submit_horen_teil1',
      'Reicht das Hörverstehen-Teil 1 ein: kurze Mono-Ansagen (Durchsage, Anrufbeantworter usw.) mit jeweils einer Richtig/Falsch-Aufgabe.'
    ),
    sleep(delay).then(() =>
      generateHorenTeil(
        level,
        getHorenTeil2Prompt,
        'submit_horen_teil2',
        'Reicht das Hörverstehen-Teil 2 ein: ein durchgehender Alltagsdialog (mehrere Mini-Szenen) mit Multiple-Choice-Aufgaben.'
      )
    ),
    sleep(delay * 2).then(() =>
      generateHorenTeil(
        level,
        getHorenTeil3Prompt,
        'submit_horen_teil3',
        'Reicht das Hörverstehen-Teil 3 ein: Radio-/Podcast- oder TV-Interview als Dialog mit Richtig/Falsch-Aufgaben.'
      )
    ),
    sleep(delay * 3).then(() =>
      generateHorenTeil(
        level,
        getHorenTeil4Prompt,
        'submit_horen_teil4',
        'Reicht das Hörverstehen-Teil 4 ein: fünf kurze getrennte Alltagsdialoge, je eine Richtig/Falsch-Aufgabe pro Dialog.'
      )
    ),
  ])

  return {
    content: {
      teil1: t1.content,
      teil2: t2.content,
      teil3: t3.content,
      teil4: t4.content,
    },
    answers: { ...t1.answers, ...t2.answers, ...t3.answers, ...t4.answers },
  }
}

// ====================================================================
// SPRECHEN — Generation + Scoring
// ====================================================================

const sprechenTaskSchema = z.object({
  id: z.number(),
  type: z.enum(['planning', 'presentation', 'reaction']),
  topic: z.string().min(5),
  points: z.array(z.string().min(2)).min(2).max(6),
})

const sprechenContentSchema = z.object({
  tasks: z.array(sprechenTaskSchema).length(3),
})

const sprechenFeedbackSchema = z.object({
  score: z.number().min(0).max(100),
  criteria: z.object({
    taskFulfillment: z.number().min(0).max(20),
    fluency: z.number().min(0).max(20),
    vocabulary: z.number().min(0).max(20),
    grammar: z.number().min(0).max(20),
    pronunciation: z.number().min(0).max(20),
  }),
  comment: z.string().min(10),
})


export interface SprechenGenResult {
  content: SprechenContent
}

export async function generateSprechen(level: ExamLevel): Promise<SprechenGenResult> {
  const validated = await generateWithTool({
    systemPrompt: SYSTEM_PROMPT_TOOL_GEN,
    userPrompt: getSprechenPrompt(level),
    toolName: 'submit_sprechen_tasks',
    toolDescription: 'Reicht die drei Sprechaufgaben (Planning, Presentation, Reaction) für das Modul Sprechen ein.',
    schema: sprechenContentSchema,
    maxTokens: 2048,
  })

  return {
    content: {
      tasks: validated.tasks.map((t) => ({
        id: t.id,
        type: t.type,
        topic: t.topic,
        points: t.points,
      })),
    },
  }
}


export async function scoreSprechen(
  level: ExamLevel,
  transcript: string,
  taskType: string,
  taskTopic: string,
  taskPoints: string[]
): Promise<SprechenFeedback> {
  return generateWithTool({
    systemPrompt: SYSTEM_PROMPT_TOOL_SCORE,
    userPrompt: getSprechenScorePrompt(level, taskType, taskTopic, taskPoints, transcript),
    toolName: 'submit_sprechen_score',
    toolDescription: 'Reicht die Bewertung der mündlichen Leistung nach Goethe-Kriterien ein.',
    schema: sprechenFeedbackSchema,
    maxTokens: 2048,
    operation: 'claude_score',
  })
}
