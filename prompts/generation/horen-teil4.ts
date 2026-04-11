import type { ExamLevel } from '@/types/exam'

export function getHorenTeil4Prompt(level: ExamLevel): string {
  return `Erstelle Teil 4 des Moduls Hören für das Goethe-Zertifikat ${level}.

SZENARIO: **5 kurze Alltags- oder Situationsgespräche** (Diskussionen, Nachbarschaft, Behörde light, Laden, öffentlicher Raum).

ANFORDERUNGEN:
- 5 Gespräche, je 40–80 Wörter gesprochener Inhalt
- Jedes Gespräch: "dialogue" mit 4–10 Repliken, mindestens zwei Sprecher pro Script
- Jedes Gespräch: genau 1 Richtig/Falsch-Aufgabe
- Jeder Text wird 2× abgespielt
- Script IDs: 8–12, Task IDs: 16–20

ALLE 7 ROLLEN (role) — exakt diese Schlüsselwörter. **Über alle 5 Scripts zusammen** muss jede Rolle **mindestens einmal** vorkommen (verteile die Rollen auf die verschiedenen Gespräche):
- casual_female — junge Frau, Alltag
- casual_male — junger Mann, Alltag
- professional_female — formell, z. B. Verkäuferin, Sachbearbeiterin
- professional_male — formell, z. B. Beamter, Verkäufer
- announcer — z. B. Durchsage im Hintergrund eines Mini-Szenarios (Bahnhof/Markt) oder kurze offizielle Ansage
- elderly_female — ältere Nachbarin, Kundin, Passantin
- child — Kind in der Szene (z. B. mit Elternteil)

Schwerpunkt Teil 4: **professional** + **casual** + **elderly_female** in den Szenen; **announcer** und **child** dort einbauen, wo die Situation es trägt.

emotion optional: neutral | happy | worried | angry | sad | polite

ANTWORTE NUR MIT VALIDEM JSON:
{
  "scripts": [
    {
      "id": 8,
      "playCount": 2,
      "dialogue": [
        { "speaker": "Mann", "role": "casual_male", "text": "…", "emotion": "polite" },
        { "speaker": "Frau", "role": "professional_female", "text": "…", "emotion": "neutral" }
      ],
      "tasks": [{ "id": 16, "type": "rf", "statement": "…", "answer": "richtig" }]
    }
  ]
}

WICHTIG: Pro Script nur "dialogue". Genau 5 Scripts (IDs 8–12). Vor dem Ausgeben prüfen: über **alle fünf Dialoge** gesehen kommt jede der 7 role-Werte mindestens einmal vor.

Niveau: ${level}. Mische richtig und falsch.`
}
