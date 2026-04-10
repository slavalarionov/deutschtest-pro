import type { ExamLevel } from '@/types/exam'

export function getLesenTeil2Prompt(level: ExamLevel): string {
  return `Du bist ein Experte für Goethe-Zertifikat ${level} Prüfungen.

Erstelle Teil 2 des Moduls Lesen für das Goethe-Zertifikat ${level}.

Format:
- Ein längerer Text (Zeitungsartikel, Bericht)
- 6 Multiple-Choice-Aufgaben mit je 3 Optionen (a, b, c)
- Eine Aufgabe als Beispiel (isExample: true)

Antworte NUR mit validem JSON:
{
  "text": "...",
  "tasks": [
    { "id": 0, "statement": "Frage... a) ... b) ... c) ...", "answer": "a", "isExample": true },
    { "id": 7, "statement": "...", "answer": "b" },
    ...
  ]
}

Niveau: ${level}. Texte und Fragen müssen diesem Niveau entsprechen.`
}
