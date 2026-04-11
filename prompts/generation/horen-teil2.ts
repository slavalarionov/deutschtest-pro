import type { ExamLevel } from '@/types/exam'

export function getHorenTeil2Prompt(level: ExamLevel): string {
  return `Erstelle Teil 2 des Moduls Hören für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
- 1 längerer Hörtext: Interview oder Radiobeitrag (200–300 Wörter gesprochener Inhalt)
- Mindestens zwei Sprecher (z. B. Moderator + Gast); jede Replik als eigenes Objekt im Array "dialogue"
- 5 Multiple-Choice-Aufgaben (a, b, c)
- Der Text wird 1x abgespielt
- Script ID: 6, Task IDs: 6–10

ROLLEN (role) für ElevenLabs — wähle passend pro Replik:
- professional_male / professional_female: Moderation, formelle Einleitung
- casual_male / casual_female: Interviewpartner, Alltagston
- announcer: kurze Jingle-/Sendungsansage am Anfang (optional, 1 Replik)

emotion optional: neutral | happy | worried | angry | sad | polite

ANTWORTE NUR MIT VALIDEM JSON:
{
  "scripts": [
    {
      "id": 6,
      "playCount": 1,
      "dialogue": [
        { "speaker": "Moderator", "role": "professional_male", "text": "Guten Tag! Heute bei uns...", "emotion": "neutral" },
        { "speaker": "Gast", "role": "casual_female", "text": "Danke, dass ich hier sein darf.", "emotion": "happy" }
      ],
      "tasks": [
        { "id": 6, "type": "mc", "question": "Worum geht es im Interview?", "options": { "a": "...", "b": "...", "c": "..." }, "answer": "b" }
      ]
    }
  ]
}

WICHTIG: Kein Feld "script" oder "voiceType" — nur "dialogue" mit mindestens 6–12 Repliken für ein flüssiges Interview.

Niveau: ${level}.`
}
