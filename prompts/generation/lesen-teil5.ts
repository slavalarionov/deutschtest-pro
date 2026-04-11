import type { ExamLevel } from '@/types/exam'

export function getLesenTeil5Prompt(level: ExamLevel): string {
  return `Erstelle Teil 5 des Moduls Lesen für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
- Schreibe einen kurzen Text (150–200 Wörter) mit 7 Lücken, Niveau ${level}
- Markiere Lücken im Text als ___(26)___, ___(27)___ usw.
- Erstelle genau 7 Lückenaufgaben:
  - Lücke 0 ist ein Beispiel (isExample: true)
  - Lücken 26–31 sind die echten Aufgaben
  - Jede Lücke hat 3 Optionen (a, b, c), nur eine passt grammatisch und semantisch

ANTWORTE NUR MIT VALIDEM JSON:
{
  "text": "Liebe Freunde, ich ___(0)___ euch von meinem Urlaub ___(26)___. Wir sind ___(27)___ ...",
  "gaps": [
    { "id": 0, "options": { "a": "möchte", "b": "möchten", "c": "möchtest" }, "answer": "a", "isExample": true },
    { "id": 26, "options": { "a": "erzählen", "b": "erzählt", "c": "erzähle" }, "answer": "a" },
    ...
  ]
}`
}
