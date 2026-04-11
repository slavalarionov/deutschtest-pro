import type { ExamLevel } from '@/types/exam'

export function getLesenTeil4Prompt(level: ExamLevel): string {
  return `Erstelle Teil 4 des Moduls Lesen für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
- Erstelle 8 kurze Texte (Anzeigen, Aushänge, Hinweisschilder) mit je 30–60 Wörtern, Niveau ${level}
- Texte haben IDs: "a" bis "h"
- Erstelle genau 8 Situationen:
  - Situation 0 ist ein Beispiel (isExample: true)
  - Situationen 19–25 sind die echten Aufgaben
  - Jede Situation beschreibt, was eine Person sucht/braucht
  - Die Antwort ist die ID des passenden Textes (a–h)
  - Jeder Text wird maximal einmal zugeordnet; manche Texte bleiben übrig

ANTWORTE NUR MIT VALIDEM JSON:
{
  "texts": [
    { "id": "a", "text": "Anzeige/Aushang..." },
    { "id": "b", "text": "..." },
    ...
  ],
  "situations": [
    { "id": 0, "situation": "Beispiel: Sie suchen...", "answer": "a", "isExample": true },
    { "id": 19, "situation": "...", "answer": "c" },
    ...
  ]
}`
}
