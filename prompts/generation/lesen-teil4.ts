import type { ExamLevel } from '@/types/exam'

export function getLesenTeil4Prompt(level: ExamLevel): string {
  return `Du bist ein Experte für Goethe-Zertifikat ${level} Prüfungen.

Erstelle Teil 4 des Moduls Lesen für das Goethe-Zertifikat ${level}.

Format:
- 7 kurze Texte (Anzeigen, Notizen, Schilder)
- 7 Aufgaben: Zuordnung von Situationen zu Texten
- Eine Aufgabe als Beispiel (isExample: true)

Antworte NUR mit validem JSON:
{
  "texts": [
    { "id": 1, "text": "..." },
    ...
  ],
  "tasks": [
    { "id": 0, "statement": "...", "answer": "a", "isExample": true },
    { "id": 20, "statement": "...", "answer": "c" },
    ...
  ]
}

Niveau: ${level}.`
}
