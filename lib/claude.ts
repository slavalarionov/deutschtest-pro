// server-only — this file must NEVER be imported in client components
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
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
import { horenDialogueEmotionSchema } from '@/lib/horen-emotion'
import { logAiUsage } from './ai-usage-logger'
import { calculateAnthropicCost } from './ai-pricing'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const MAX_RETRIES = 5

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function generateWithClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 4096,
  operation: 'claude_generate' | 'claude_score' = 'claude_generate'
): Promise<string> {
  let lastError: unknown

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) await sleep(5000 * attempt)

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      })

      const block = message.content[0]
      if (block.type !== 'text') {
        throw new Error('Unexpected response type from Claude')
      }

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

      return block.text
    } catch (err) {
      lastError = err
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('overloaded') || msg.includes('529')) {
        console.warn(`Claude overloaded, retry ${attempt + 1}/${MAX_RETRIES}...`)
        continue
      }
      throw err
    }
  }

  throw lastError
}

export async function scoreWithClaude(
  systemPrompt: string,
  submission: string,
  maxTokens: number = 2048
): Promise<string> {
  return generateWithClaude(systemPrompt, submission, maxTokens, 'claude_score')
}

// --- JSON extraction ---

function extractJSON(raw: string): unknown {
  let jsonStr = raw

  const codeBlockMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim()
  } else {
    const firstBrace = raw.indexOf('{')
    const lastBrace = raw.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = raw.substring(firstBrace, lastBrace + 1)
    }
  }

  try {
    return JSON.parse(jsonStr)
  } catch (e) {
    console.error('Raw Claude response (first 500 chars):', raw.substring(0, 500))
    throw new Error(`Failed to parse Claude JSON: ${e instanceof Error ? e.message : 'unknown'}`)
  }
}

const GENERATE_AND_PARSE_RETRIES = 3

async function generateAndParse<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
  maxTokens: number = 4096
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= GENERATE_AND_PARSE_RETRIES; attempt++) {
    try {
      const raw = await generateWithClaude(systemPrompt, userPrompt, maxTokens)
      const json = extractJSON(raw)
      return schema.parse(json)
    } catch (err) {
      lastError = err
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`generateAndParse attempt ${attempt}/${GENERATE_AND_PARSE_RETRIES} failed: ${msg}`)
      if (attempt < GENERATE_AND_PARSE_RETRIES) {
        await sleep(2000 * attempt)
      }
    }
  }

  throw lastError
}

// --- System prompt ---

const SYSTEM_PROMPT = `Du bist ein erfahrener Prüfungsautor für das Goethe-Zertifikat.
Du erstellst ausschließlich Aufgaben im offiziellen Prüfungsformat.
Du antwortest IMMER nur mit validem JSON — kein Markdown, kein Text drumherum, nur reines JSON.`

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
  const validated = await generateAndParse(SYSTEM_PROMPT, getLesenTeil1Prompt(level), teil1Schema, 4096)

  const answers: Record<string, string> = {}
  const tasks = validated.tasks.map((t) => {
    if (!t.isExample) answers[`t1_${t.id}`] = t.answer
    return { id: t.id, statement: t.statement, isExample: t.isExample, ...(t.isExample ? { answer: t.answer } : {}) }
  })

  return { content: { text: validated.text, tasks } as LesenTeil1, answers }
}

async function generateTeil2(level: ExamLevel) {
  const validated = await generateAndParse(SYSTEM_PROMPT, getLesenTeil2Prompt(level), teil2Schema, 4096)

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
  const validated = await generateAndParse(SYSTEM_PROMPT, getLesenTeil3Prompt(level), teil3Schema, 4096)

  const answers: Record<string, string> = {}
  const tasks = validated.tasks.map((t) => {
    if (!t.isExample) answers[`t3_${t.id}`] = t.answer
    return { id: t.id, statement: t.statement, isExample: t.isExample, ...(t.isExample ? { answer: t.answer } : {}) }
  })

  return { content: { text: validated.text, tasks }, answers }
}

async function generateTeil4(level: ExamLevel) {
  const validated = await generateAndParse(SYSTEM_PROMPT, getLesenTeil4Prompt(level), teil4Schema, 4096)

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
  const validated = await generateAndParse(SYSTEM_PROMPT, getLesenTeil5Prompt(level), teil5Schema, 4096)

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

const schreibenTaskSchema = z.object({
  id: z.number(),
  type: z.enum(['email', 'forum', 'brief']),
  situation: z.string().min(20),
  prompt: z.string().min(20),
  requiredPoints: z.array(z.string().min(3)).min(3).max(5),
  wordCount: z.number().min(20).max(200),
  samplePost: z.string().optional(),
})

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
  const validated = await generateAndParse(SYSTEM_PROMPT, getSchreibenPrompt(level), schreibenSchema, 2048)

  return {
    content: {
      tasks: validated.tasks.map((t) => ({
        id: t.id,
        prompt: t.prompt,
        context: t.samplePost || t.situation,
        requiredPoints: t.requiredPoints,
        wordCount: t.wordCount,
      })),
    },
  }
}


export async function scoreSchreiben(
  level: ExamLevel,
  task: string,
  requiredPoints: string[],
  userText: string
): Promise<SchreibenFeedback> {
  return generateAndParse(
    SYSTEM_PROMPT,
    getSchreibenScorePrompt(level, task, requiredPoints, userText),
    schreibenFeedbackSchema,
    2048
  )
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

const horenScriptSchema = z
  .object({
    id: z.number(),
    playCount: z.number().min(1).max(2),
    tasks: z.array(z.union([horenRFTaskSchema, horenMCTaskSchema])).min(1),
    script: z.string().min(10).optional(),
    voiceType: z
      .enum(['male_professional', 'female_professional', 'male_casual', 'female_casual'])
      .optional(),
    dialogue: z.array(horenDialogueLineSchema).min(2).optional(),
  })
  .refine(
    (data) => {
      const mono = Boolean(data.script && data.voiceType)
      const dia = Boolean(data.dialogue && data.dialogue.length >= 2)
      return mono !== dia
    },
    {
      message:
        'Entweder script+voiceType ODER dialogue (mind. 2 Repliken), nicht beides und nicht keins.',
    }
  )

const horenTeilSchema = z.object({
  scripts: z.array(horenScriptSchema).min(1),
})


export interface HorenWithAnswers {
  content: HorenContent
  answers: Record<string, string>
}

async function generateHorenTeil(
  level: ExamLevel,
  promptFn: (level: ExamLevel) => string
) {
  const validated = await generateAndParse(SYSTEM_PROMPT, promptFn(level), horenTeilSchema, 4096)

  const answers: Record<string, string> = {}
  const scripts = validated.scripts.map((s) => {
    const tasks = s.tasks.map((t) => {
      answers[`h_${t.id}`] = t.answer
      if (t.type === 'rf') {
        return { id: t.id, type: 'rf' as const, statement: t.statement }
      }
      return { id: t.id, type: 'mc' as const, question: t.question, options: t.options }
    })

    if (s.dialogue && s.dialogue.length >= 2) {
      return {
        id: s.id,
        playCount: s.playCount,
        dialogue: s.dialogue,
        tasks,
      }
    }

    return {
      id: s.id,
      playCount: s.playCount,
      script: s.script!,
      voiceType: s.voiceType!,
      tasks,
    }
  })

  return { content: { scripts }, answers }
}

export async function generateHorenFull(level: ExamLevel): Promise<HorenWithAnswers> {
  const delay = 5000
  const [t1, t2, t3, t4] = await Promise.all([
    generateHorenTeil(level, getHorenTeil1Prompt),
    sleep(delay).then(() => generateHorenTeil(level, getHorenTeil2Prompt)),
    sleep(delay * 2).then(() => generateHorenTeil(level, getHorenTeil3Prompt)),
    sleep(delay * 3).then(() => generateHorenTeil(level, getHorenTeil4Prompt)),
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
  const validated = await generateAndParse(SYSTEM_PROMPT, getSprechenPrompt(level), sprechenContentSchema, 2048)

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
  return generateAndParse(
    SYSTEM_PROMPT,
    getSprechenScorePrompt(level, taskType, taskTopic, taskPoints, transcript),
    sprechenFeedbackSchema,
    2048
  )
}
