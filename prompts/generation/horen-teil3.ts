import type { ExamLevel } from '@/types/exam'

export function getHorenTeil3Prompt(level: ExamLevel): string {
  return `Erstelle Teil 3 des Moduls Hören für das Goethe-Zertifikat ${level}.

SZENARIO: **Radio-, Podcast- oder TV-Interview**.

STRUKTUR — **maximal 2 Gesprächspartner** im eigentlichen Interview:
- **Moderation:** entweder professional_male **oder** professional_female (eine Moderator-Stimme durchgehend).
- **Gast:** genau eine weitere Person: **casual_female**, **casual_male** **oder** **elderly_female** (wähle eine passende Rolle).

OPTIONAL (Sender-Design):
- **Maximal 2 kurze Repliken** mit role **announcer** (nur Programmhinweis am Anfang und/oder Schluss), **kein** dritter Gesprächspartner im Interview selbst.
- **Kein** child in Teil 3 (wirkt selten natürlich im Format).

VERBOTEN im Hauptgespräch:
- Keine dritte „Interview“-Stimme (nicht zwei Gäste gleichzeitig, kein Wechsel zu einem dritten Charakter mitten im Gespräch).

ANFORDERUNGEN:
- 200–300 Wörter, 10–16 Repliken im "dialogue".
- 5 Richtig/Falsch-Aufgaben, Script ID 7, Task-IDs 11–15.
- Kein "script"/"voiceType".

emotion optional: neutral | happy | worried | angry | sad | polite

Für jedes Hörscript wähle entweder "mode": "mono" (eine Person spricht — dann fülle "script" und "voiceType") oder "mode": "dialogue" (mehrere Personen — dann fülle "dialogue" als Liste von Repliken). Mische die beiden Modi nicht innerhalb eines Scripts.

Übergib das Ergebnis ausschließlich über das bereitgestellte Tool. Verwende authentisches, natürliches Deutsch — typografische Anführungszeichen („…") sind im Inhalt erwünscht.

Niveau: ${level}. Mische richtig und falsch.`
}
