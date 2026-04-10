import type { ExamLevel } from '@/types/exam'

export function getLesenTeil1Prompt(level: ExamLevel): string {
  return `Du bist ein Experte für Goethe-Zertifikat ${level} Prüfungen.

Erstelle Teil 1 des Moduls Lesen für das Goethe-Zertifikat ${level}.

Format:
- Ein kurzer Text (Blog, E-Mail, Anzeige — je nach Niveau)
- 6 Aussagen zum Text
- Aufgabentyp: Richtig oder Falsch
- Eine Aussage als Beispiel (isExample: true)

Antworte NUR mit validem JSON im folgenden Format:
{
  "text": "...",
  "tasks": [
    { "id": 0, "statement": "...", "answer": "richtig", "isExample": true },
    { "id": 1, "statement": "...", "answer": "falsch" },
    ...
  ]
}

Der Text muss dem Niveau ${level} entsprechen (Wortschatz, Grammatik, Länge).`
}
