import type { ExamLevel } from '@/types/exam'

export function getSprechenScorePrompt(
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
