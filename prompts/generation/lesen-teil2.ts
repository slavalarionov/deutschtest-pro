import type { ExamLevel } from '@/types/exam'

export function getLesenTeil2Prompt(level: ExamLevel): string {
  return `Erstelle Teil 2 des Moduls Lesen für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
- Schreibe einen Zeitungsartikel auf Deutsch (400–500 Wörter), Niveau ${level}
- Thema: Gesellschaft, Kultur, Wissenschaft oder Bildung
- Erstelle genau 7 Aufgaben insgesamt:
  - Aufgabe 0 ist ein Beispiel (isExample: true)
  - Die Aufgaben mit den IDs 7–12 sind die sechs echten Multiple-Choice-Aufgaben
  - Jede hat 3 Optionen (a, b, c), nur eine ist korrekt
- Fragen beziehen sich auf verschiedene Absätze

Strukturiere die vollständige Antwort ausschließlich über das bereitgestellte Tool (kein JSON als Fließtext, kein zusätzlicher Erläuterungstext).`
}
