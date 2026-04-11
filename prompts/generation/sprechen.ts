import type { ExamLevel } from '@/types/exam'

export function getSprechenPrompt(level: ExamLevel): string {
  return `Erstelle das Modul Sprechen für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
Erstelle genau 3 Aufgaben:

1. Teil 1 — Gemeinsam etwas planen (type: "planning"):
   - Ein alltägliches Thema, das zwei Personen zusammen planen
   - Genau 4 Diskussionspunkte (Was? Wann? Wo? Wie?)
   - Beispiel: "Einen gemeinsamen Ausflug planen"

2. Teil 2 — Ein Thema präsentieren (type: "presentation"):
   - Ein Thema für eine kurze Präsentation
   - Genau 5 Punkte als Folien-Stichworte:
     Folie 1: Thema nennen / eigene Erfahrung
     Folie 2: Situation im Heimatland / in Deutschland
     Folie 3: Vorteile
     Folie 4: Nachteile
     Folie 5: Eigene Meinung / Zusammenfassung
   - Beispiel: "Soziale Medien im Alltag"

3. Teil 3 — Auf eine Präsentation reagieren (type: "reaction"):
   - Eine Frage oder ein Kommentar als Reaktion auf die Präsentation aus Teil 2
   - 2–3 Stichpunkte als Hilfe
   - Beispiel: "Was denken Sie über die Nutzung sozialer Medien?"

Themen: Alltag, Freizeit, Arbeit, Medien, Umwelt, Gesundheit, Bildung, Reise.
Niveau: ${level}.

ANTWORTE NUR MIT VALIDEM JSON:
{
  "tasks": [
    { "id": 1, "type": "planning", "topic": "...", "points": ["...", "...", "...", "..."] },
    { "id": 2, "type": "presentation", "topic": "...", "points": ["Folie 1: ...", "Folie 2: ...", "Folie 3: ...", "Folie 4: ...", "Folie 5: ..."] },
    { "id": 3, "type": "reaction", "topic": "...", "points": ["...", "..."] }
  ]
}`
}
