import type { ExamLevel } from '@/types/exam'

export function getLesenTeil5Prompt(level: ExamLevel): string {
  return `Du bist ein Experte für Goethe-Zertifikat ${level} Prüfungen.

Erstelle Teil 5 des Moduls Lesen für das Goethe-Zertifikat ${level}.

Format:
- Ein kurzer Text mit Lücken (Lückentext / Cloze)
- 6 Aufgaben: Wähle das richtige Wort (a, b oder c)
- Eine Aufgabe als Beispiel (isExample: true)

Antworte NUR mit validem JSON:
{
  "text": "Text mit ___(27)___ Lücken ___(28)___ ...",
  "tasks": [
    { "id": 0, "statement": "(0) a) haben b) sein c) werden", "answer": "a", "isExample": true },
    { "id": 27, "statement": "(27) a) ... b) ... c) ...", "answer": "b" },
    ...
  ]
}

Niveau: ${level}.`
}
