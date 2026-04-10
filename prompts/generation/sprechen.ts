import type { ExamLevel } from '@/types/exam'

export function getSprechenPrompt(level: ExamLevel): string {
  return `Du bist ein Experte für Goethe-Zertifikat ${level} Prüfungen.

Erstelle das Modul Sprechen für das Goethe-Zertifikat ${level}.

Format:
- Teil 1: Sich vorstellen / Planung (planning)
- Teil 2: Ein Thema präsentieren (presentation)
- Teil 3: Auf Fragen reagieren (reaction)

Für jede Aufgabe: Thema + Stichpunkte

Antworte NUR mit validem JSON:
{
  "tasks": [
    {
      "id": 1,
      "type": "planning",
      "topic": "Einen gemeinsamen Ausflug planen",
      "points": ["Wohin?", "Wann?", "Was mitnehmen?", "Wie hinkommen?"]
    },
    {
      "id": 2,
      "type": "presentation",
      "topic": "Ein Thema zum Präsentieren...",
      "points": ["Eigene Erfahrung", "Vorteile", "Nachteile", "Meinung"]
    },
    {
      "id": 3,
      "type": "reaction",
      "topic": "Fragen zum Thema...",
      "points": ["Zustimmung/Ablehnung", "Begründung"]
    }
  ]
}

Niveau: ${level}.`
}
