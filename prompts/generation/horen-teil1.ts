import type { ExamLevel } from '@/types/exam'

export function getHorenTeil1Prompt(level: ExamLevel): string {
  return `Du bist ein Experte für Goethe-Zertifikat ${level} Prüfungen.

Erstelle Teil 1 des Moduls Hören für das Goethe-Zertifikat ${level}.

Format:
- 5 kurze Hörtexte (Durchsagen, Ansagen, Nachrichten)
- Jeder Text: 1 Aufgabe (Richtig/Falsch)
- Jeder Text wird 2x abgespielt
- Gib für jeden Hörtext an: script, voiceType, playCount

Antworte NUR mit validem JSON:
{
  "scripts": [
    {
      "id": 1,
      "script": "Vollständiger gesprochener Text...",
      "voiceType": "female_professional",
      "playCount": 2,
      "tasks": [{ "id": 1, "statement": "...", "answer": "richtig" }]
    },
    ...
  ]
}

Niveau: ${level}. Sprechtempo und Wortschatz müssen dem Niveau entsprechen.`
}
