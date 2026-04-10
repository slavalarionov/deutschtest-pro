import type { ExamLevel } from '@/types/exam'

export function getHorenTeil4Prompt(level: ExamLevel): string {
  return `Du bist ein Experte für Goethe-Zertifikat ${level} Prüfungen.

Erstelle Teil 4 des Moduls Hören für das Goethe-Zertifikat ${level}.

Format:
- 5 kurze Alltagsgespräche
- Jedes Gespräch: 1 Aufgabe (Richtig/Falsch oder Multiple-Choice)
- Jeder Text wird 2x abgespielt

Antworte NUR mit validem JSON:
{
  "scripts": [
    {
      "id": 1,
      "script": "Kurzer Dialog...",
      "voiceType": "male_casual",
      "playCount": 2,
      "tasks": [{ "id": 16, "statement": "...", "answer": "falsch" }]
    },
    ...
  ]
}

Niveau: ${level}.`
}
