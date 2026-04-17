// Промпт скоринга Sprechen. Шаблон в БД, файл — fallback.
// Плейсхолдеры: {level}, {task_type_label}, {task_topic}, {task_points}, {transcript}.

import type { ExamLevel } from '@/types/exam'
import { getPrompt } from '@/lib/prompt-store'

export const PROMPT_KEY = 'scoring/sprechen-score'

export const FALLBACK_TEMPLATE = `Du bist ein offizieller Prüfer für das Goethe-Zertifikat {level}, Modul Sprechen.

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

Übergib deine Bewertung ausschließlich über das bereitgestellte Tool. Schreibe das Feedback im Kommentar auf authentischem Deutsch — typografische Anführungszeichen sind erlaubt.`

export async function buildSprechenScorePrompt(
  level: ExamLevel,
  taskType: string,
  taskTopic: string,
  taskPoints: string[],
  transcript: string
): Promise<string> {
  const typeLabel = taskType === 'planning'
    ? 'Teil 1 — Gemeinsam etwas planen'
    : taskType === 'presentation'
      ? 'Teil 2 — Ein Thema präsentieren'
      : 'Teil 3 — Auf eine Präsentation reagieren'

  const template = await getPrompt(PROMPT_KEY, FALLBACK_TEMPLATE)
  return template
    .replaceAll('{level}', level)
    .replaceAll('{task_type_label}', typeLabel)
    .replaceAll('{task_topic}', taskTopic)
    .replaceAll('{task_points}', taskPoints.map((p, i) => `${i + 1}. ${p}`).join('\n'))
    .replaceAll('{transcript}', transcript)
}
