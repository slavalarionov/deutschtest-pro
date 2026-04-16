import type { ExamLevel } from '@/types/exam'

export function getLesenTeil3Prompt(level: ExamLevel): string {
  return `Erstelle Teil 3 des Moduls Lesen für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
- Schreibe einen Regeltext (Hausordnung, Bibliotheksregeln, Kursregeln, Vereinsregeln) (250–350 Wörter), Niveau ${level}
- Erstelle genau 8 Aufgaben:
  - Aufgabe 0 ist ein Beispiel (isExample: true) mit Antwort "ja"
  - Aufgaben 12–18: Aussagen mit "ja" oder "nein"
  - Mischung: ca. Hälfte "ja", Hälfte "nein"

Strukturiere die vollständige Antwort ausschließlich über das bereitgestellte Tool (kein JSON als Fließtext, kein zusätzlicher Erläuterungstext).`
}
