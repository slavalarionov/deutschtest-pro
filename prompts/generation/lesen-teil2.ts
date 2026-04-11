import type { ExamLevel } from '@/types/exam'

export function getLesenTeil2Prompt(level: ExamLevel): string {
  return `Erstelle Teil 2 des Moduls Lesen für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
- Schreibe einen Zeitungsartikel auf Deutsch (400–500 Wörter), Niveau ${level}
- Thema: Gesellschaft, Kultur, Wissenschaft oder Bildung
- Erstelle genau 6 Multiple-Choice-Aufgaben:
  - Aufgabe 0 ist ein Beispiel (isExample: true)
  - Aufgaben 7–11 sind die echten Aufgaben
  - Jede hat 3 Optionen (a, b, c), nur eine ist korrekt
- Fragen beziehen sich auf verschiedene Absätze

ANTWORTE NUR MIT VALIDEM JSON:
{
  "text": "Der vollständige Zeitungsartikel...",
  "tasks": [
    { "id": 0, "question": "Was ist das Hauptthema?", "options": { "a": "...", "b": "...", "c": "..." }, "answer": "b", "isExample": true },
    { "id": 7, "question": "...", "options": { "a": "...", "b": "...", "c": "..." }, "answer": "a" },
    ...
  ]
}`
}
