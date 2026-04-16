// Промпт для генерации персональных рекомендаций в /dashboard/recommendations.
// Принимает краткую сводку всех user_attempts пользователя и просит Claude
// дать общую оценку, сильные/слабые стороны, план и мотивацию — всё на немецком.

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

function formatAttempt(a: RecommendationsAttemptSummary, idx: number): string {
  const date = new Date(a.submittedAt).toISOString().slice(0, 10)
  const base = `${idx + 1}. ${date} · ${a.level} · ${MODULE_LABEL[a.module]} · ${a.score}/100`
  if (!a.aiFeedbackComment) return base
  const shortened = a.aiFeedbackComment.length > 300
    ? a.aiFeedbackComment.slice(0, 300).trim() + '…'
    : a.aiFeedbackComment
  return `${base}\n   Prüfer-Kommentar: ${shortened}`
}

export function getRecommendationsPrompt(input: RecommendationsInput): string {
  const attemptsBlock = input.attempts.map(formatAttempt).join('\n')

  const moduleAveragesBlock = input.moduleAverages
    .map((m) => `${MODULE_LABEL[m.module]}: Ø ${m.averageScore}/100 (${m.attempts} Modul${m.attempts === 1 ? '' : 'e'})`)
    .join('\n') || '—'

  const levelAveragesBlock = input.levelAverages
    .map((l) => `${l.level}: Ø ${l.averageScore}/100 (${l.attempts} Modul${l.attempts === 1 ? '' : 'e'})`)
    .join('\n') || '—'

  const strongest = input.strongestModule ? MODULE_LABEL[input.strongestModule] : '—'
  const weakest = input.weakestModule ? MODULE_LABEL[input.weakestModule] : '—'

  return `Du bist ein erfahrener Lerncoach für Deutsch als Fremdsprache. Ein Prüfling trainiert mit unserer Plattform für das Goethe-Zertifikat und möchte persönliche Empfehlungen auf Basis seiner bisherigen Ergebnisse.

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

Erstelle personalisierte Empfehlungen auf Deutsch (Du-Form, freundlicher aber konkreter Ton). Dein Output muss folgende Struktur haben:

1. overallAssessment: 2–4 Sätze allgemeine Einschätzung des aktuellen Vorbereitungsstands — ehrlich, aber ermutigend.
2. strengths: 2–4 konkrete Stärken (was der Prüfling gut kann, mit Bezug auf die Daten).
3. weaknesses: 2–4 konkrete Schwächen bzw. Bereiche, an denen gearbeitet werden sollte.
4. studyPlan: 3–5 konkrete nächste Schritte. Jeder Schritt hat einen kurzen \`title\` (1 Zeile) und eine konkrete \`description\` (2–3 Sätze mit praktischer Anleitung, gern mit Modul-Namen und Anzahl empfohlener Module).
5. motivation: 1–2 motivierende Sätze am Ende — persönlich, nicht generisch.

Wichtig:
- Verwende ausschließlich das bereitgestellte Tool, um die Antwort strukturiert zurückzugeben.
- Nenne Module auf Deutsch: Lesen, Hören, Schreiben, Sprechen (nicht "Listening", nicht "Reading").
- Sprich direkt den Prüfling an (Du). Erwähne weder „KI" noch „Claude" noch andere Provider.
- Wenn bisher nur 1 Modul absolviert wurde, sei entsprechend zurückhaltend mit Aussagen über Trends.
- Plan soll realistisch sein: 1 Modul kostet 1 Kredit auf unserer Plattform, also empfehle konkrete Anzahlen (z. B. „2 weitere Schreiben-Module auf A2").`
}
