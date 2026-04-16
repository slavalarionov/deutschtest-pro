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

Strukturiere die vollständige Antwort ausschließlich über das bereitgestellte Tool (kein JSON als Fließtext, kein zusätzlicher Erläuterungstext).`
}
