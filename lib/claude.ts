// server-only — this file must NEVER be imported in client components
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { ExamLevel, LesenTeil1, LesenTeil4, LesenContent, SchreibenContent, SchreibenFeedback, SprechenFeedback, SprechenContent, HorenContent } from '@/types/exam'

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
  maxTokens: number = 4096
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
  return generateWithClaude(systemPrompt, submission, maxTokens)
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

function teil1Prompt(level: ExamLevel): string {
  return `Erstelle Teil 1 des Moduls Lesen für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
- Schreibe einen Blogbeitrag auf Deutsch (350–450 Wörter), Niveau ${level}
- Thema: ein alltägliches Thema (Umzug, Arbeit, Urlaub, Hobby, Nachbarschaft, Kochen, Sport)
- Erstelle genau 7 Aufgaben:
  - Aufgabe 0 ist ein Beispiel (isExample: true) mit Antwort "richtig"
  - Aufgaben 1–6: genau 3 "richtig" und 3 "falsch"
- Jede Aufgabe ist eine Aussage über den Text

ANTWORTE NUR MIT VALIDEM JSON:
{
  "text": "Der vollständige Blogbeitrag...",
  "tasks": [
    { "id": 0, "statement": "Beispiel...", "answer": "richtig", "isExample": true },
    { "id": 1, "statement": "...", "answer": "richtig" },
    { "id": 2, "statement": "...", "answer": "falsch" },
    ...
  ]
}`
}

// --- Teil 2: Zeitungsartikel + Multiple Choice ---

function teil2Prompt(level: ExamLevel): string {
  return `Erstelle Teil 2 des Moduls Lesen für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
- Schreibe einen Zeitungsartikel auf Deutsch (400–500 Wörter), Niveau ${level}
- Thema: Gesellschaft, Kultur, Wissenschaft oder Bildung
- Erstelle genau 6 Multiple-Choice-Aufgaben:
  - Aufgabe 0 ist ein Beispiel (isExample: true)
  - Aufgaben 7–11 sind die echten Aufgaben
  - Jede hat 3 Optionen (a, b, c), nur eine ist korrekt
- Fragen beziehen sich auf verschiedene Absätze

ANTWORTE NUR MIT VALIDEM JSON:
{
  "text": "Der vollständige Zeitungsartikel...",
  "tasks": [
    { "id": 0, "question": "Was ist das Hauptthema?", "options": { "a": "...", "b": "...", "c": "..." }, "answer": "b", "isExample": true },
    { "id": 7, "question": "...", "options": { "a": "...", "b": "...", "c": "..." }, "answer": "a" },
    ...
  ]
}`
}

// --- Teil 3: Regeln/Anweisungen + ja/nein ---

function teil3Prompt(level: ExamLevel): string {
  return `Erstelle Teil 3 des Moduls Lesen für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
- Schreibe einen Regeltext (Hausordnung, Bibliotheksregeln, Kursregeln, Vereinsregeln) (250–350 Wörter), Niveau ${level}
- Erstelle genau 8 Aufgaben:
  - Aufgabe 0 ist ein Beispiel (isExample: true) mit Antwort "ja"
  - Aufgaben 12–18: Aussagen mit "ja" oder "nein"
  - Mischung: ca. Hälfte "ja", Hälfte "nein"

ANTWORTE NUR MIT VALIDEM JSON:
{
  "text": "Der vollständige Regeltext...",
  "tasks": [
    { "id": 0, "statement": "Beispiel...", "answer": "ja", "isExample": true },
    { "id": 12, "statement": "...", "answer": "nein" },
    ...
  ]
}`
}

// --- Teil 4: Kurztexte + Zuordnung ---

function teil4Prompt(level: ExamLevel): string {
  return `Erstelle Teil 4 des Moduls Lesen für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
- Erstelle 8 kurze Texte (Anzeigen, Aushänge, Hinweisschilder) mit je 30–60 Wörtern, Niveau ${level}
- Texte haben IDs: "a" bis "h"
- Erstelle genau 8 Situationen:
  - Situation 0 ist ein Beispiel (isExample: true)
  - Situationen 19–25 sind die echten Aufgaben
  - Jede Situation beschreibt, was eine Person sucht/braucht
  - Die Antwort ist die ID des passenden Textes (a–h)
  - Jeder Text wird maximal einmal zugeordnet; manche Texte bleiben übrig

ANTWORTE NUR MIT VALIDEM JSON:
{
  "texts": [
    { "id": "a", "text": "Anzeige/Aushang..." },
    { "id": "b", "text": "..." },
    ...
  ],
  "situations": [
    { "id": 0, "situation": "Beispiel: Sie suchen...", "answer": "a", "isExample": true },
    { "id": 19, "situation": "...", "answer": "c" },
    ...
  ]
}`
}

// --- Teil 5: Lückentext + a/b/c ---

function teil5Prompt(level: ExamLevel): string {
  return `Erstelle Teil 5 des Moduls Lesen für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
- Schreibe einen kurzen Text (150–200 Wörter) mit 7 Lücken, Niveau ${level}
- Markiere Lücken im Text als ___(26)___, ___(27)___ usw.
- Erstelle genau 7 Lückenaufgaben:
  - Lücke 0 ist ein Beispiel (isExample: true)
  - Lücken 26–31 sind die echten Aufgaben
  - Jede Lücke hat 3 Optionen (a, b, c), nur eine passt grammatisch und semantisch

ANTWORTE NUR MIT VALIDEM JSON:
{
  "text": "Liebe Freunde, ich ___(0)___ euch von meinem Urlaub ___(26)___. Wir sind ___(27)___ ...",
  "gaps": [
    { "id": 0, "options": { "a": "möchte", "b": "möchten", "c": "möchtest" }, "answer": "a", "isExample": true },
    { "id": 26, "options": { "a": "erzählen", "b": "erzählt", "c": "erzähle" }, "answer": "a" },
    ...
  ]
}`
}

// --- Generators ---

async function generateTeil1(level: ExamLevel) {
  const validated = await generateAndParse(SYSTEM_PROMPT, teil1Prompt(level), teil1Schema, 4096)

  const answers: Record<string, string> = {}
  const tasks = validated.tasks.map((t) => {
    if (!t.isExample) answers[`t1_${t.id}`] = t.answer
    return { id: t.id, statement: t.statement, isExample: t.isExample, ...(t.isExample ? { answer: t.answer } : {}) }
  })

  return { content: { text: validated.text, tasks } as LesenTeil1, answers }
}

async function generateTeil2(level: ExamLevel) {
  const validated = await generateAndParse(SYSTEM_PROMPT, teil2Prompt(level), teil2Schema, 4096)

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
  const validated = await generateAndParse(SYSTEM_PROMPT, teil3Prompt(level), teil3Schema, 4096)

  const answers: Record<string, string> = {}
  const tasks = validated.tasks.map((t) => {
    if (!t.isExample) answers[`t3_${t.id}`] = t.answer
    return { id: t.id, statement: t.statement, isExample: t.isExample, ...(t.isExample ? { answer: t.answer } : {}) }
  })

  return { content: { text: validated.text, tasks }, answers }
}

async function generateTeil4(level: ExamLevel) {
  const validated = await generateAndParse(SYSTEM_PROMPT, teil4Prompt(level), teil4Schema, 4096)

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
  const validated = await generateAndParse(SYSTEM_PROMPT, teil5Prompt(level), teil5Schema, 4096)

  const answers: Record<string, string> = {}
  const gaps = validated.gaps.map((g) => {
    if (!g.isExample) answers[`t5_${g.id}`] = g.answer
    return { id: g.id, options: g.options, isExample: g.isExample, ...(g.isExample ? { answer: g.answer } : {}) }
  })

  return { content: { text: validated.text, gaps }, answers }
}

// --- Full Lesen generation (all 5 Teile in parallel) ---

async function staggered<T>(fns: (() => Promise<T>)[], delayMs: number): Promise<T[]> {
  const promises = fns.map((fn, i) =>
    sleep(i * delayMs).then(() => fn())
  )
  return Promise.all(promises)
}

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

function schreibenPrompt(level: ExamLevel): string {
  const wordCounts: Record<ExamLevel, number> = { A1: 30, A2: 50, B1: 80 }
  const wc = wordCounts[level]

  return `Erstelle das Modul Schreiben für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
- Erstelle genau 1 Schreibaufgabe
- Type: "email" oder "forum" (je nach Niveau)
- Situation: Beschreibe den Kontext (wem schreibt man, warum)
- Prompt: Die eigentliche Aufgabe
- requiredPoints: 3–4 inhaltliche Punkte, die der Text behandeln muss
- wordCount: ca. ${wc} Wörter
- samplePost: Bei Forumaufgaben — der Originalbeitrag, auf den geantwortet wird (optional)

Themen: Alltag, Freizeit, Arbeit, Wohnung, Reise, Kurs, Veranstaltung.
Niveau: ${level}

ANTWORTE NUR MIT VALIDEM JSON:
{
  "tasks": [
    {
      "id": 1,
      "type": "email",
      "situation": "Sie haben eine Anzeige für eine Wohnung gelesen und möchten...",
      "prompt": "Schreiben Sie eine E-Mail an den Vermieter.",
      "requiredPoints": ["sich vorstellen", "Fragen zur Wohnung stellen", "Besichtigungstermin vorschlagen"],
      "wordCount": ${wc}
    }
  ]
}`
}

export interface SchreibenGenResult {
  content: SchreibenContent
}

export async function generateSchreiben(level: ExamLevel): Promise<SchreibenGenResult> {
  const validated = await generateAndParse(SYSTEM_PROMPT, schreibenPrompt(level), schreibenSchema, 2048)

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

function scoreSchreibenPrompt(level: ExamLevel, task: string, requiredPoints: string[], userText: string): string {
  return `Du bist ein offizieller Prüfer für das Goethe-Zertifikat ${level}, Modul Schreiben.

AUFGABE war:
${task}

INHALTLICHE PUNKTE die behandelt werden sollten:
${requiredPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

TEXT DES PRÜFLINGS:
"${userText}"

Bewerte den Text nach den offiziellen Goethe-Bewertungskriterien:
1. Aufgabenerfüllung (0–25): Wurden alle Inhaltspunkte behandelt? Ist das Format korrekt?
2. Kohärenz (0–25): Ist der Text logisch aufgebaut? Gibt es Konnektoren?
3. Wortschatz (0–25): Passt der Wortschatz zum Niveau ${level}? Ist er vielfältig?
4. Grammatik (0–25): Sind die grammatischen Strukturen korrekt? Passen sie zum Niveau?

ANTWORTE NUR MIT VALIDEM JSON:
{
  "score": 0-100,
  "criteria": {
    "taskFulfillment": 0-25,
    "coherence": 0-25,
    "vocabulary": 0-25,
    "grammar": 0-25
  },
  "comment": "Detailliertes Feedback auf Deutsch mit konkreten Verbesserungsvorschlägen..."
}

Sei fair aber streng — wie ein echter Goethe-Prüfer. Gib konkretes, hilfreiches Feedback.`
}

export async function scoreSchreiben(
  level: ExamLevel,
  task: string,
  requiredPoints: string[],
  userText: string
): Promise<SchreibenFeedback> {
  return generateAndParse(
    SYSTEM_PROMPT,
    scoreSchreibenPrompt(level, task, requiredPoints, userText),
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

const horenScriptSchema = z.object({
  id: z.number(),
  script: z.string().min(20),
  voiceType: z.enum(['male_professional', 'female_professional', 'male_casual', 'female_casual']),
  playCount: z.number().min(1).max(2),
  tasks: z.array(z.union([horenRFTaskSchema, horenMCTaskSchema])).min(1),
})

const horenTeilSchema = z.object({
  scripts: z.array(horenScriptSchema).min(1),
})

function horenTeil1Prompt(level: ExamLevel): string {
  return `Erstelle Teil 1 des Moduls Hören für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
- 5 kurze Hörtexte (Durchsagen, Ansagen am Bahnhof/Flughafen, Nachrichten auf Anrufbeantworter, Radioansagen)
- Jeder Text: 40–80 Wörter, klar und deutlich formuliert
- Jeder Text: 1 Aufgabe Richtig/Falsch
- Jeder Text wird 2x abgespielt
- voiceType abwechselnd: male_professional, female_professional, male_casual, female_casual
- IDs der Scripts: 1–5, IDs der Tasks: 1–5

ANTWORTE NUR MIT VALIDEM JSON:
{
  "scripts": [
    {
      "id": 1,
      "script": "Achtung, eine Durchsage: Der Zug nach München...",
      "voiceType": "female_professional",
      "playCount": 2,
      "tasks": [{ "id": 1, "type": "rf", "statement": "Der Zug fährt heute nicht.", "answer": "falsch" }]
    },
    ...
  ]
}

Niveau: ${level}. Mische richtig und falsch gleichmäßig.`
}

function horenTeil2Prompt(level: ExamLevel): string {
  return `Erstelle Teil 2 des Moduls Hören für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
- 1 längerer Hörtext: Interview oder Radiobeitrag (200–300 Wörter)
- 5 Multiple-Choice-Aufgaben (a, b, c)
- Der Text wird 1x abgespielt
- voiceType: male_professional
- Script ID: 6, Task IDs: 6–10

ANTWORTE NUR MIT VALIDEM JSON:
{
  "scripts": [
    {
      "id": 6,
      "script": "Moderator: Guten Tag! Heute bei uns im Studio ist...",
      "voiceType": "male_professional",
      "playCount": 1,
      "tasks": [
        { "id": 6, "type": "mc", "question": "Worum geht es im Interview?", "options": { "a": "...", "b": "...", "c": "..." }, "answer": "b" },
        ...
      ]
    }
  ]
}

Niveau: ${level}.`
}

function horenTeil3Prompt(level: ExamLevel): string {
  return `Erstelle Teil 3 des Moduls Hören für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
- 1 Alltagsgespräch zwischen zwei Personen (200–300 Wörter)
- 5 Aufgaben Richtig/Falsch
- Der Text wird 1x abgespielt
- voiceType: female_casual
- Script ID: 7, Task IDs: 11–15

ANTWORTE NUR MIT VALIDEM JSON:
{
  "scripts": [
    {
      "id": 7,
      "script": "Anna: Hey, hast du schon gehört? ...",
      "voiceType": "female_casual",
      "playCount": 1,
      "tasks": [
        { "id": 11, "type": "rf", "statement": "...", "answer": "richtig" },
        ...
      ]
    }
  ]
}

Niveau: ${level}. Mische richtig und falsch.`
}

function horenTeil4Prompt(level: ExamLevel): string {
  return `Erstelle Teil 4 des Moduls Hören für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
- 5 kurze Alltagsgespräche (je 40–80 Wörter)
- Jedes Gespräch: 1 Richtig/Falsch-Aufgabe
- Jeder Text wird 2x abgespielt
- voiceType abwechselnd: male_casual, female_casual
- Script IDs: 8–12, Task IDs: 16–20

ANTWORTE NUR MIT VALIDEM JSON:
{
  "scripts": [
    {
      "id": 8,
      "script": "Mann: Entschuldigung, wissen Sie wo...",
      "voiceType": "male_casual",
      "playCount": 2,
      "tasks": [{ "id": 16, "type": "rf", "statement": "...", "answer": "richtig" }]
    },
    ...
  ]
}

Niveau: ${level}. Mische richtig und falsch.`
}

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
  const scripts = validated.scripts.map((s) => ({
    ...s,
    tasks: s.tasks.map((t) => {
      answers[`h_${t.id}`] = t.answer
      if (t.type === 'rf') {
        return { id: t.id, type: 'rf' as const, statement: t.statement }
      }
      return { id: t.id, type: 'mc' as const, question: t.question, options: t.options }
    }),
  }))

  return { content: { scripts }, answers }
}

export async function generateHorenFull(level: ExamLevel): Promise<HorenWithAnswers> {
  const delay = 5000
  const [t1, t2, t3, t4] = await Promise.all([
    generateHorenTeil(level, horenTeil1Prompt),
    sleep(delay).then(() => generateHorenTeil(level, horenTeil2Prompt)),
    sleep(delay * 2).then(() => generateHorenTeil(level, horenTeil3Prompt)),
    sleep(delay * 3).then(() => generateHorenTeil(level, horenTeil4Prompt)),
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

function sprechenPrompt(level: ExamLevel): string {
  return `Erstelle das Modul Sprechen für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
Erstelle genau 3 Aufgaben:

1. Teil 1 — Gemeinsam etwas planen (type: "planning"):
   - Ein alltägliches Thema, das zwei Personen zusammen planen
   - Genau 4 Diskussionspunkte (Was? Wann? Wo? Wie?)
   - Beispiel: "Einen gemeinsamen Ausflug planen"

2. Teil 2 — Ein Thema präsentieren (type: "presentation"):
   - Ein Thema für eine kurze Präsentation
   - Genau 5 Punkte als Folien-Stichworte:
     Folie 1: Thema nennen / eigene Erfahrung
     Folie 2: Situation im Heimatland / in Deutschland
     Folie 3: Vorteile
     Folie 4: Nachteile
     Folie 5: Eigene Meinung / Zusammenfassung
   - Beispiel: "Soziale Medien im Alltag"

3. Teil 3 — Auf eine Präsentation reagieren (type: "reaction"):
   - Eine Frage oder ein Kommentar als Reaktion auf die Präsentation aus Teil 2
   - 2–3 Stichpunkte als Hilfe
   - Beispiel: "Was denken Sie über die Nutzung sozialer Medien?"

Themen: Alltag, Freizeit, Arbeit, Medien, Umwelt, Gesundheit, Bildung, Reise.
Niveau: ${level}.

ANTWORTE NUR MIT VALIDEM JSON:
{
  "tasks": [
    { "id": 1, "type": "planning", "topic": "...", "points": ["...", "...", "...", "..."] },
    { "id": 2, "type": "presentation", "topic": "...", "points": ["Folie 1: ...", "Folie 2: ...", "Folie 3: ...", "Folie 4: ...", "Folie 5: ..."] },
    { "id": 3, "type": "reaction", "topic": "...", "points": ["...", "..."] }
  ]
}`
}

export interface SprechenGenResult {
  content: SprechenContent
}

export async function generateSprechen(level: ExamLevel): Promise<SprechenGenResult> {
  const validated = await generateAndParse(SYSTEM_PROMPT, sprechenPrompt(level), sprechenContentSchema, 2048)

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

function scoreSprechenPrompt(
  level: ExamLevel,
  taskType: string,
  taskTopic: string,
  taskPoints: string[],
  transcript: string
): string {
  const typeLabel = taskType === 'planning'
    ? 'Teil 1 — Gemeinsam etwas planen'
    : taskType === 'presentation'
      ? 'Teil 2 — Ein Thema präsentieren'
      : 'Teil 3 — Auf eine Präsentation reagieren'

  return `Du bist ein offizieller Prüfer für das Goethe-Zertifikat ${level}, Modul Sprechen.

AUFGABE: ${typeLabel}
Thema: ${taskTopic}

Erwartete Inhaltspunkte:
${taskPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

TRANSKRIPTION DES PRÜFLINGS:
"${transcript}"

Bewerte nach den offiziellen Goethe-Bewertungskriterien:
1. Aufgabenerfüllung (0–20): Wurden alle Punkte der Aufgabe behandelt? Passt die Antwort zur Aufgabenstellung?
2. Flüssigkeit (0–20): Spricht der Prüfling zusammenhängend? Gibt es lange Pausen oder Abbrüche?
3. Wortschatz (0–20): Ist der Wortschatz dem Niveau ${level} angemessen und vielfältig?
4. Grammatik (0–20): Sind die grammatischen Strukturen korrekt und dem Niveau angemessen?
5. Aussprache (0–20): Kann indirekt beurteilt werden — korrekte Wortformen, keine Verwechslungen.

ANTWORTE NUR MIT VALIDEM JSON:
{
  "score": 0-100,
  "criteria": {
    "taskFulfillment": 0-20,
    "fluency": 0-20,
    "vocabulary": 0-20,
    "grammar": 0-20,
    "pronunciation": 0-20
  },
  "comment": "Detailliertes Feedback auf Deutsch mit konkreten Verbesserungsvorschlägen..."
}

Sei fair aber streng — wie ein echter Goethe-Prüfer.`
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
    scoreSprechenPrompt(level, taskType, taskTopic, taskPoints, transcript),
    sprechenFeedbackSchema,
    2048
  )
}
