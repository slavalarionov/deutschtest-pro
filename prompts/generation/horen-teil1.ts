import type { ExamLevel } from '@/types/exam'

export function getHorenTeil1Prompt(level: ExamLevel): string {
  return `Erstelle Teil 1 des Moduls Hören für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
- 5 kurze Hörtexte (Durchsagen, Ansagen am Bahnhof/Flughafen, Nachrichten auf Anrufbeantworter, Radioansagen)
- Jeder Text: 40–80 Wörter, klar und deutlich formuliert
- Jeder Text: 1 Aufgabe Richtig/Falsch
- Jeder Text wird 2x abgespielt
- voiceType abwechselnd: male_professional, female_professional, male_casual, female_casual
- IDs der Scripts: 1–5, IDs der Tasks: 1–5

ANTWORTE NUR MIT VALIDEM JSON:
{
  "scripts": [
    {
      "id": 1,
      "script": "Achtung, eine Durchsage: Der Zug nach München...",
      "voiceType": "female_professional",
      "playCount": 2,
      "tasks": [{ "id": 1, "type": "rf", "statement": "Der Zug fährt heute nicht.", "answer": "falsch" }]
    },
    ...
  ]
}

Niveau: ${level}. Mische richtig und falsch gleichmäßig.`
}
