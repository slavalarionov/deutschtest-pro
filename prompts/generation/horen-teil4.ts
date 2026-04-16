import type { ExamLevel } from '@/types/exam'

export function getHorenTeil4Prompt(level: ExamLevel): string {
  return `Erstelle Teil 4 des Moduls Hören für das Goethe-Zertifikat ${level}.

STRUKTUR: **5 getrennte kurze Dialoge** — jeweils **genau 2 verschiedene Sprecher** (nur 2 verschiedene role-Werte pro Script, abwechselnde Repliken).

EMPFOHLENE PAARE (Script-Reihenfolge IDs 8–12, Task-IDs 16–20):
- Dialog 1 (id 8): casual_male + casual_female
- Dialog 2 (id 9): professional_male + elderly_female
- Dialog 3 (id 10): casual_female + professional_female
- Dialog 4 (id 11): casual_male + professional_male
- Dialog 5 (id 12): child + casual_female (z. B. Mutter/Verkäuferin + Kind — nur **zwei** Stimmen im Dialog)

Über **alle 5 Dialoge** verteilt entsteht Vielfalt; **announcer** nur nutzen, wenn eine Szene wirklich eine **Durchsage** braucht — dann **trotzdem nur 2 Rollen pro Script** (z. B. announcer + casual_male als Zuhörer-Reaktion in 1–2 Zeilen), oder announcer in einem Script statt eines der Paare oben.

ANFORDERUNGEN:
- Je Dialog 40–80 Wörter, 4–10 Repliken.
- Pro Script genau 1 Richtig/Falsch-Aufgabe.
- playCount: 2 für jedes Script.
- Kein "script"/"voiceType".

emotion optional: neutral | happy | worried | angry | sad | polite

WICHTIG: Genau **5** Scripts (IDs 8–12). Pro Script **höchstens zwei** unterschiedliche "role"-Werte.

Für jedes Hörscript wähle entweder "mode": "mono" (eine Person spricht — dann fülle "script" und "voiceType") oder "mode": "dialogue" (mehrere Personen — dann fülle "dialogue" als Liste von Repliken). Mische die beiden Modi nicht innerhalb eines Scripts.

Übergib das Ergebnis ausschließlich über das bereitgestellte Tool. Verwende authentisches, natürliches Deutsch — typografische Anführungszeichen („…") sind im Inhalt erwünscht.

Niveau: ${level}. Mische richtig und falsch.`
}
