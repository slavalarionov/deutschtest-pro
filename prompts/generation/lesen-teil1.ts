import type { ExamLevel } from '@/types/exam'

export function getLesenTeil1Prompt(level: ExamLevel): string {
  return `Erstelle Teil 1 des Moduls Lesen für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
- Schreibe einen Blogbeitrag auf Deutsch (350–450 Wörter), Niveau ${level}
- Thema: ein alltägliches Thema (Umzug, Arbeit, Urlaub, Hobby, Nachbarschaft, Kochen, Sport)
- Erstelle genau 7 Aufgaben:
  - Aufgabe 0 ist ein Beispiel (isExample: true) mit Antwort "richtig"
  - Aufgaben 1–6: genau 3 "richtig" und 3 "falsch"
- Jede Aufgabe ist eine Aussage über den Text

ANTWORTE NUR MIT VALIDEM JSON:
{
  "text": "Der vollständige Blogbeitrag...",
  "tasks": [
    { "id": 0, "statement": "Beispiel...", "answer": "richtig", "isExample": true },
    { "id": 1, "statement": "...", "answer": "richtig" },
    { "id": 2, "statement": "...", "answer": "falsch" },
    ...
  ]
}`
}
