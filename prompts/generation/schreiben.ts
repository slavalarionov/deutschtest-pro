import type { ExamLevel } from '@/types/exam'

export function getSchreibenPrompt(level: ExamLevel): string {
  const wordCounts: Record<ExamLevel, number> = {
    A1: 30,
    A2: 40,
    B1: 80,
  }

  return `Du bist ein Experte für Goethe-Zertifikat ${level} Prüfungen.

Erstelle das Modul Schreiben für das Goethe-Zertifikat ${level}.

Format für ${level}:
- 1 Schreibaufgabe
- Kontext: Forum-Post, E-Mail oder Brief
- 3-4 inhaltliche Punkte, die behandelt werden müssen
- Ziel-Wörteranzahl: ca. ${wordCounts[level]} Wörter

Antworte NUR mit validem JSON:
{
  "tasks": [
    {
      "id": 1,
      "prompt": "Beschreibung der Aufgabe...",
      "context": "Forumsbeitrag oder Situation...",
      "requiredPoints": ["Punkt 1", "Punkt 2", "Punkt 3"],
      "wordCount": ${wordCounts[level]}
    }
  ]
}

Niveau: ${level}. Die Aufgabe muss realistisch und dem Prüfungsformat entsprechen.`
}
