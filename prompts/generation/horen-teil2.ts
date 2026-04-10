import type { ExamLevel } from '@/types/exam'

export function getHorenTeil2Prompt(level: ExamLevel): string {
  return `Du bist ein Experte für Goethe-Zertifikat ${level} Prüfungen.

Erstelle Teil 2 des Moduls Hören für das Goethe-Zertifikat ${level}.

Format:
- 1 längerer Hörtext (Gespräch, Interview, Radiobeitrag)
- 5 Multiple-Choice-Aufgaben (a, b, c)
- Der Text wird 1x abgespielt

Antworte NUR mit validem JSON:
{
  "scripts": [
    {
      "id": 1,
      "script": "Vollständiger Dialog...",
      "voiceType": "male_professional",
      "playCount": 1,
      "tasks": [
        { "id": 6, "statement": "Frage... a) ... b) ... c) ...", "answer": "b" },
        ...
      ]
    }
  ]
}

Niveau: ${level}.`
}
