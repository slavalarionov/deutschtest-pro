// Промпт скоринга Sprechen. Шаблон в БД, файл — fallback.
// Плейсхолдеры: {level}, {task_type_label}, {task_topic}, {task_points}, {transcript},
// {language_reminder}.
//
// Changelog:
// - 2026-04-18 (Этап 6.5): добавлен параметр language (de/ru/en/tr). Текст
//   комментария в ai_feedback теперь на языке пользователя. Критерии Goethe,
//   названия модулей/Teile, уровни и цитаты транскрипции — остаются на немецком.
//   Последняя немецкая строка про «authentisches Deutsch» удалена.

import type { ExamLevel } from '@/types/exam'
import { getPrompt } from '@/lib/prompt-store'
import type { Locale } from '@/i18n/request'
import { LANGUAGE_NAME } from '@/prompts/recommendations'

export const PROMPT_KEY = 'scoring/sprechen-score'

export const FALLBACK_TEMPLATE = `{language_reminder}

Du bist ein offizieller Prüfer für das Goethe-Zertifikat {level}, Modul Sprechen.

AUFGABE: {task_type_label}
Thema: {task_topic}

Erwartete Inhaltspunkte:
{task_points}

TRANSKRIPTION DES PRÜFLINGS:
\`\`\`
{transcript}
\`\`\`

Bewerte nach den offiziellen Goethe-Bewertungskriterien:
1. Aufgabenerfüllung (0–20): Wurden alle Punkte der Aufgabe behandelt? Passt die Antwort zur Aufgabenstellung?
2. Flüssigkeit (0–20): Spricht der Prüfling zusammenhängend? Gibt es lange Pausen oder Abbrüche?
3. Wortschatz (0–20): Ist der Wortschatz dem Niveau {level} angemessen und vielfältig?
4. Grammatik (0–20): Sind die grammatischen Strukturen korrekt und dem Niveau angemessen?
5. Aussprache (0–20): Kann indirekt beurteilt werden — korrekte Wortformen, keine Verwechslungen.

Übergib deine Bewertung ausschließlich über das bereitgestellte Tool.`

function buildLanguageReminder(language: Locale): string {
  return `REMINDER: Write the \`comment\` field in ${LANGUAGE_NAME[language]} (code: "${language}").

KEEP IN GERMAN (do not translate these — they are Goethe exam terms):
- Module names: Lesen, Hören, Schreiben, Sprechen
- Teile: Teil 1, Teil 2, Teil 3
- Task labels: "Gemeinsam etwas planen", "Ein Thema präsentieren", "Auf eine Präsentation reagieren"
- Levels: A1, A2, B1
- Goethe-Zertifikat, DeutschTest.pro
- Sprechen assessment criteria: Aufgabenerfüllung, Flüssigkeit, Wortschatz, Grammatik, Aussprache
- Direct quotes from the student's transcript (anything you cite in quotes "…" or „…")

Everything else in the \`comment\` — descriptions, explanations, suggestions — must be in ${LANGUAGE_NAME[language]}.`
}

export async function buildSprechenScorePrompt(
  level: ExamLevel,
  taskType: string,
  taskTopic: string,
  taskPoints: string[],
  transcript: string,
  language: Locale
): Promise<string> {
  const typeLabel = taskType === 'planning'
    ? 'Teil 1 — Gemeinsam etwas planen'
    : taskType === 'presentation'
      ? 'Teil 2 — Ein Thema präsentieren'
      : 'Teil 3 — Auf eine Präsentation reagieren'

  const template = await getPrompt(PROMPT_KEY, FALLBACK_TEMPLATE)
  return template
    .replaceAll('{language_reminder}', buildLanguageReminder(language))
    .replaceAll('{level}', level)
    .replaceAll('{task_type_label}', typeLabel)
    .replaceAll('{task_topic}', taskTopic)
    .replaceAll('{task_points}', taskPoints.map((p, i) => `${i + 1}. ${p}`).join('\n'))
    .replaceAll('{transcript}', transcript)
}
