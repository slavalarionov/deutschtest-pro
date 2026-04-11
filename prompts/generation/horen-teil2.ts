import type { ExamLevel } from '@/types/exam'

export function getHorenTeil2Prompt(level: ExamLevel): string {
  return `Erstelle Teil 2 des Moduls Hören für das Goethe-Zertifikat ${level}.

SZENARIO: ein längerer Hörtext an **Bahnhof, Flughafen oder im Geschäft/Markt** (nicht reines Studio-Interview).
- z. B. Durchsagen, Schalter, Kasse, Information, wartende oder einkaufende Personen

ANFORDERUNGEN:
- 200–300 Wörter gesprochener Inhalt, viele kurze Repliken im Array "dialogue"
- 5 Multiple-Choice-Aufgaben (a, b, c)
- Der Text wird 1× abgespielt
- Script ID: 6, Task IDs: 6–10

ALLE 7 ROLLEN (role) — exakt diese Schlüsselwörter, jeweils **mindestens einmal** im gesamten Dialog verwenden:
- casual_female — junge Frau, Alltag
- casual_male — junger Mann, Alltag
- professional_female — formell, z. B. Schalter, Verkäuferin, Mitarbeiterin Information
- professional_male — formell, z. B. Schalter, Sicherheit, Mitarbeiter
- announcer — **Lautsprecher-Durchsage** (Bahn/Airport/Markt), sachlich, keine Gesprächspartner-Stimme
- elderly_female — ältere Passantin/Kundin/Reisende
- child — Kind (z. B. mit erwachsener Begleitung, role der Begleitung separat casual_*)

Schwerpunkte Teil 2: **casual** + **professional** + **announcer** bilden das Gerüst; **elderly_female** und **child** natürlich einbauen.

emotion optional: neutral | happy | worried | angry | sad | polite

ANTWORTE NUR MIT VALIDEM JSON:
{
  "scripts": [
    {
      "id": 6,
      "playCount": 1,
      "dialogue": [
        { "speaker": "Ansage", "role": "announcer", "text": "Achtung, der Zug nach …", "emotion": "neutral" },
        { "speaker": "Mitarbeiterin", "role": "professional_female", "text": "Guten Tag, wie kann ich helfen?", "emotion": "polite" },
        { "speaker": "Reisender", "role": "casual_male", "text": "Ich suche den Ausgang.", "emotion": "neutral" }
      ],
      "tasks": [
        { "id": 6, "type": "mc", "question": "…", "options": { "a": "…", "b": "…", "c": "…" }, "answer": "b" }
      ]
    }
  ]
}

WICHTIG: Kein "script"/"voiceType". Mindestens **12–18 Repliken**. Vor dem Ausgeben prüfen: jede der 7 role-Werte kommt mindestens einmal vor.

Niveau: ${level}.`
}
