// Промпт для генерации персональных рекомендаций в /dashboard/recommendations.
// Принимает краткую сводку всех user_attempts пользователя и код языка вывода.
// Claude возвращает overallAssessment / strengths / weaknesses / studyPlan /
// motivation на языке пользователя. Данные о попытках остаются на немецком
// (модуль, уровень, AI-фидбек) — это часть симуляции Goethe.
//
// Changelog:
// - 2026-04-18: добавлен параметр language (de/ru/en/tr), инструкции о языке
//   вывода вынесены в начало промпта, термины Goethe остаются на немецком.

import type { Locale } from '@/i18n/request'

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

  return `REMINDER: Write all string fields of your tool-call response in ${LANGUAGE_NAME[language]} (code: "${language}"). Keep these German exam terms unchanged: Lesen, Hören, Schreiben, Sprechen, Teil 1-5, A1, A2, B1, Goethe-Zertifikat, DeutschTest.pro.

The learner's training data is provided in German below. Analyze it and give personalized recommendations.

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

Produce the following structured output (all prose in ${LANGUAGE_NAME[language]}, German exam terms preserved):

1. overallAssessment: 2–4 sentences — honest but encouraging assessment of the current preparation level.
2. strengths: 2–4 specific strengths grounded in the data.
3. weaknesses: 2–4 specific weaknesses or areas to work on.
4. studyPlan: 3–5 concrete next steps. Each step has a short \`title\` (1 line) and a \`description\` (2–3 sentences with practical guidance, referencing German module names and suggested module counts).
5. motivation: 1–2 motivating sentences — personal, not generic.

Rules:
- Address the learner directly in the second person (use the native equivalent: "du" for de, "ты" for ru, "you" for en, "sen" for tr).
- Do not mention AI, Claude, or any provider.
- If the learner has only completed 1 module, be appropriately cautious about trends.
- Realistic plan: 1 module costs 1 credit on our platform, so recommend concrete numbers (e.g. "2 more Schreiben modules at A2").
- Return the answer exclusively via the provided tool.`
}
