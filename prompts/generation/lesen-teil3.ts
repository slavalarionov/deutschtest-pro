import type { ExamLevel } from '@/types/exam'

export function getLesenTeil3Prompt(level: ExamLevel): string {
  return `Du bist ein Experte für Goethe-Zertifikat ${level} Prüfungen.

Erstelle Teil 3 des Moduls Lesen für das Goethe-Zertifikat ${level}.

Format:
- Ein Text (Anleitung, Hausordnung, Regeln)
- 7 Aussagen: Ja oder Nein
- Eine Aussage als Beispiel (isExample: true)

Antworte NUR mit validem JSON:
{
  "text": "...",
  "tasks": [
    { "id": 0, "statement": "...", "answer": "ja", "isExample": true },
    { "id": 13, "statement": "...", "answer": "nein" },
    ...
  ]
}

Niveau: ${level}.`
}
