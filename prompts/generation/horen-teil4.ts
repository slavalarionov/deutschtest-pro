import type { ExamLevel } from '@/types/exam'

export function getHorenTeil4Prompt(level: ExamLevel): string {
  return `Erstelle Teil 4 des Moduls Hören für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
- 5 kurze Alltagsgespräche (je 40–80 Wörter gesprochener Inhalt)
- Jedes Gespräch: zwei Sprecher, abwechselnde Repliken im Array "dialogue" (je 4–10 Zeilen)
- Jedes Gespräch: 1 Richtig/Falsch-Aufgabe
- Jeder Text wird 2x abgespielt
- Script IDs: 8–12, Task IDs: 16–20

Typische Rollen: casual_male + casual_female; bei Bedarf elderly_female oder professional_female (z. B. Verkäuferin).

emotion optional: neutral | happy | worried | angry | sad | polite

ANTWORTE NUR MIT VALIDEM JSON:
{
  "scripts": [
    {
      "id": 8,
      "playCount": 2,
      "dialogue": [
        { "speaker": "Mann", "role": "casual_male", "text": "Entschuldigung, wissen Sie, wo die Post ist?", "emotion": "polite" },
        { "speaker": "Frau", "role": "casual_female", "text": "Ja, gleich um die Ecke.", "emotion": "neutral" }
      ],
      "tasks": [{ "id": 16, "type": "rf", "statement": "...", "answer": "richtig" }]
    }
  ]
}

WICHTIG: Pro Script nur "dialogue", kein "script"/"voiceType".

Niveau: ${level}. Mische richtig und falsch.`
}
