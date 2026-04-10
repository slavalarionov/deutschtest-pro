import type { ExamLevel } from '@/types/exam'

export function getHorenTeil3Prompt(level: ExamLevel): string {
  return `Du bist ein Experte für Goethe-Zertifikat ${level} Prüfungen.

Erstelle Teil 3 des Moduls Hören für das Goethe-Zertifikat ${level}.

Format:
- 1 längeres Gespräch (Alltagssituation)
- 5 Aufgaben: Richtig oder Falsch
- Der Text wird 1x abgespielt

Antworte NUR mit validem JSON:
{
  "scripts": [
    {
      "id": 1,
      "script": "Vollständiger Dialog...",
      "voiceType": "female_casual",
      "playCount": 1,
      "tasks": [
        { "id": 11, "statement": "...", "answer": "richtig" },
        ...
      ]
    }
  ]
}

Niveau: ${level}.`
}
