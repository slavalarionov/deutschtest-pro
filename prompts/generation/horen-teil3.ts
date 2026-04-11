import type { ExamLevel } from '@/types/exam'

export function getHorenTeil3Prompt(level: ExamLevel): string {
  return `Erstelle Teil 3 des Moduls Hören für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
- 1 Alltagsgespräch zwischen zwei Personen (200–300 Wörter gesprochener Inhalt)
- Jede gesprochene Zeile = eigenes Objekt in "dialogue" mit role (casual_male / casual_female usw.)
- 5 Aufgaben Richtig/Falsch
- Der Text wird 1x abgespielt
- Script ID: 7, Task IDs: 11–15

emotion optional: neutral | happy | worried | angry | sad | polite

ANTWORTE NUR MIT VALIDEM JSON:
{
  "scripts": [
    {
      "id": 7,
      "playCount": 1,
      "dialogue": [
        { "speaker": "Anna", "role": "casual_female", "text": "Hey, hast du schon gehört?", "emotion": "neutral" },
        { "speaker": "Ben", "role": "casual_male", "text": "Nein, was denn?", "emotion": "neutral" }
      ],
      "tasks": [
        { "id": 11, "type": "rf", "statement": "...", "answer": "richtig" }
      ]
    }
  ]
}

WICHTIG: Kein "script"/"voiceType" — nur "dialogue" mit mindestens 8–14 Repliken.

Niveau: ${level}. Mische richtig und falsch.`
}
