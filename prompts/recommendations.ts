// Промпт для генерации рекомендаций — новый flow: Claude классифицирует слабые
// зоны через закрытый enum топиков, summary_text — свободный обзорный текст.
// Сервер потом матчит топики с learning_resources и рендерит ссылки.
//
// Changelog:
// - 2026-04-25: переработан под Tool Use со структурой weak_areas[] + summary_text.
//   Список 14 закреплённых топиков (lib/learning-tags.ts), Claude обязан выбирать
//   только из этого списка — иначе Zod упадёт и сработает ретрай. Старая схема
//   strengths/weaknesses/studyPlan/motivation удалена.
// - 2026-04-18: добавлен параметр language (de/ru/en/tr).

import type { Locale } from '@/i18n/request'
import { LEARNING_TAGS, TAG_LABELS } from '@/lib/learning-tags'

export type RecommendationsModule = 'lesen' | 'horen' | 'schreiben' | 'sprechen'
export type RecommendationsLevel = 'A1' | 'A2' | 'B1'

export interface RecommendationsAttemptSummary {
  module: RecommendationsModule
  level: RecommendationsLevel
  score: number
  submittedAt: string
  aiFeedbackComment?: string | null
}

export interface RecommendationsInput {
  totalAttempts: number
  averageScore: number
  bestScore: number
  attempts: RecommendationsAttemptSummary[]
  moduleAverages: { module: RecommendationsModule; averageScore: number; attempts: number }[]
  levelAverages: { level: RecommendationsLevel; averageScore: number; attempts: number }[]
  weakestModule: RecommendationsModule | null
  strongestModule: RecommendationsModule | null
}

const MODULE_LABEL: Record<RecommendationsModule, string> = {
  lesen: 'Lesen',
  horen: 'Hören',
  schreiben: 'Schreiben',
  sprechen: 'Sprechen',
}

export const LANGUAGE_NAME: Record<Locale, string> = {
  de: 'German (Deutsch)',
  ru: 'Russian (Русский)',
  en: 'English',
  tr: 'Turkish (Türkçe)',
}

function formatAttempt(a: RecommendationsAttemptSummary, idx: number): string {
  const date = new Date(a.submittedAt).toISOString().slice(0, 10)
  const base = `${idx + 1}. ${date} · ${a.level} · ${MODULE_LABEL[a.module]} · ${a.score}/100`
  if (!a.aiFeedbackComment) return base
  const shortened = a.aiFeedbackComment.length > 300
    ? a.aiFeedbackComment.slice(0, 300).trim() + '…'
    : a.aiFeedbackComment
  return `${base}\n   Prüfer-Kommentar: ${shortened}`
}

function topicCatalogBlock(language: Locale): string {
  return LEARNING_TAGS.map((tag) => {
    const label = TAG_LABELS[tag][language]
    return `- "${tag}" — ${label}`
  }).join('\n')
}

export function getRecommendationsPrompt(
  input: RecommendationsInput,
  language: Locale
): string {
  const attemptsBlock = input.attempts.map(formatAttempt).join('\n')

  const moduleAveragesBlock = input.moduleAverages
    .map((m) => `${MODULE_LABEL[m.module]}: Ø ${m.averageScore}/100 (${m.attempts} Modul${m.attempts === 1 ? '' : 'e'})`)
    .join('\n') || '—'

  const levelAveragesBlock = input.levelAverages
    .map((l) => `${l.level}: Ø ${l.averageScore}/100 (${l.attempts} Modul${l.attempts === 1 ? '' : 'e'})`)
    .join('\n') || '—'

  const strongest = input.strongestModule ? MODULE_LABEL[input.strongestModule] : '—'
  const weakest = input.weakestModule ? MODULE_LABEL[input.weakestModule] : '—'

  return `REMINDER: Write all string fields (reason, summary_text) of your tool-call response in ${LANGUAGE_NAME[language]} (code: "${language}"). Keep these German exam terms unchanged: Lesen, Hören, Schreiben, Sprechen, Teil 1-5, A1, A2, B1, Goethe-Zertifikat, DeutschTest.pro.

The learner's training data is provided in German below. Analyze it and identify 1–8 specific weak areas to address.

GESAMTSTATISTIK:
- Absolvierte Module: ${input.totalAttempts}
- Durchschnittliche Punktzahl: ${input.averageScore}/100
- Beste Punktzahl: ${input.bestScore}/100
- Stärkstes Modul: ${strongest}
- Schwächstes Modul: ${weakest}

DURCHSCHNITT NACH MODUL:
${moduleAveragesBlock}

DURCHSCHNITT NACH NIVEAU:
${levelAveragesBlock}

EINZELNE MODUL-ERGEBNISSE (chronologisch, ältestes zuerst):
${attemptsBlock}

CRITICAL — TOPIC TAG ENUM (closed list, you MUST pick exactly one of these for each weak_area.topic):
${topicCatalogBlock(language)}

DO NOT invent new topic tags. If a weakness does not fit any specific tag, use "general". Use "wortschatz" for vocabulary gaps, "aussprache" only when feedback explicitly mentions pronunciation.

Produce structured output via the tool:

1. weak_areas: array of 1–8 items, each:
   - topic: one of the enum values above (lowercase, exact match)
   - level: "a1" | "a2" | "b1" (the level where this weakness shows up — use lowercase)
   - module: "lesen" | "horen" | "schreiben" | "sprechen"
   - severity: "high" | "medium" | "low" — high = blocks passing the exam, medium = noticeable gap, low = polish point
   - reason: 1–2 sentences (10–300 chars) directly addressing the learner ("du" / "ты" / "you" / "sen" per language) and grounded in the data above

2. strengths: array of 0–4 items (empty array is valid), each:
   - module: "lesen" | "horen" | "schreiben" | "sprechen"
   - level: "a1" | "a2" | "b1"
   - what_works: short title (10–200 chars) — a concrete skill, e.g. "Struktur von Briefen", "Понимание основной идеи", "Aufgabenerfüllung in Schreiben". NO generic praise.
   - evidence: 1–2 sentences (20–400 chars) with specific numbers/facts grounded in the data above, e.g. "В последних 3 попытках Schreiben на A1 средний балл 78/100, особенно сильно с Inhaltspunkten."

   Rules for strengths:
   - Confident strength: a module/level average >= 60. Add it.
   - Relative strength: average 40–59 but noticeably higher than the learner's other modules. Add with cautious phrasing.
   - Everything below 40 and no relative strength: return [] (empty array). DO NOT invent praise.
   - Do not duplicate summary_text wording verbatim.
   - Forbidden phrasings: "Молодец!", "You're doing great!", "Toll gemacht!" — only concrete facts.
   - Prefer 1–2 sharp strengths over 4 vague ones.

3. summary_text: 2–4 sentences (50–1500 chars) — honest but encouraging assessment of the current preparation level. No bullets, no markdown.

Rules:
- Address the learner directly in the second person.
- Do not mention AI, Claude, or any provider.
- If only 1 module was completed, be cautious about trends and likely return strengths: [] (one attempt is not a trend).
- Order weak_areas by severity (high first).
- Each weak_area should be specific and actionable, not generic.
- Return the answer exclusively via the provided tool.`
}
