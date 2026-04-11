import type { ExamLevel } from '@/types/exam'

export function getHorenTeil3Prompt(level: ExamLevel): string {
  return `Erstelle Teil 3 des Moduls Hören für das Goethe-Zertifikat ${level}.

SZENARIO: **Radio-, Podcast- oder TV-Interview** (Studiogespräch oder Reportage mit Gesprächspartnern).

ANFORDERUNGEN:
- 200–300 Wörter gesprochener Inhalt
- Jede Replik = Objekt in "dialogue" mit passendem "role"
- 5 Aufgaben Richtig/Falsch
- Der Text wird 1× abgespielt
- Script ID: 7, Task IDs: 11–15

ALLE 7 ROLLEN (role) — exakt diese Schlüsselwörter, jeweils **mindestens einmal** im gesamten Interview:
- casual_female — junge Frau, Alltag / lockere Gesprächspartnerin
- casual_male — junger Mann, Alltag / lockere Gesprächspartner
- professional_female — Moderatorin, formelle Einleitung, ernstes Fachgespräch
- professional_male — Moderator, formelle Einleitung, ernstes Fachgespräch
- announcer — kurze **Sender-/Programm-Ansage** oder Jingle-Text zu Beginn oder nach Pause (1–2 Repliken)
- elderly_female — ältere Interviewgästin oder Expertin
- child — Kind oder Jugendlicher als Gast (z. B. Schule, Hobby, Familienthema)

Schwerpunkt Teil 3: **professional_male** / **professional_female** (Moderation, Führung) + **casual_male** / **casual_female** (Gäste im Alltagston); announcer, elderly_female und child **situativ** einweben.

emotion optional: neutral | happy | worried | angry | sad | polite

ANTWORTE NUR MIT VALIDEM JSON:
{
  "scripts": [
    {
      "id": 7,
      "playCount": 1,
      "dialogue": [
        { "speaker": "Ansage", "role": "announcer", "text": "Sie hören …", "emotion": "neutral" },
        { "speaker": "Moderatorin", "role": "professional_female", "text": "Willkommen in unserer Sendung.", "emotion": "neutral" },
        { "speaker": "Gast", "role": "casual_male", "text": "Danke für die Einladung.", "emotion": "happy" }
      ],
      "tasks": [
        { "id": 11, "type": "rf", "statement": "…", "answer": "richtig" }
      ]
    }
  ]
}

WICHTIG: Kein "script"/"voiceType". Mindestens **12–18 Repliken**. Jede der 7 role-Werte mindestens einmal.

Niveau: ${level}. Mische richtig und falsch.`
}
