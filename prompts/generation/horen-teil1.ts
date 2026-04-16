import type { ExamLevel } from '@/types/exam'

export function getHorenTeil1Prompt(level: ExamLevel): string {
  return `Erstelle Teil 1 des Moduls Hören für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
- 5 kurze Hörtexte (Durchsagen, Ansagen am Bahnhof/Flughafen, Nachrichten auf Anrufbeantworter, Radioansagen)
- Jeder Text: 40–80 Wörter, klar und deutlich formuliert
- Jeder Text: 1 Aufgabe Richtig/Falsch
- Jeder Text wird 2x abgespielt
- voiceType abwechselnd: male_professional, female_professional, male_casual, female_casual
- IDs der Scripts: 1–5, IDs der Tasks: 1–5

Für jedes Hörscript wähle entweder "mode": "mono" (eine Person spricht — dann fülle "script" und "voiceType") oder "mode": "dialogue" (mehrere Personen — dann fülle "dialogue" als Liste von Repliken). Mische die beiden Modi nicht innerhalb eines Scripts.

Übergib das Ergebnis ausschließlich über das bereitgestellte Tool. Verwende authentisches, natürliches Deutsch — typografische Anführungszeichen („…") sind im Inhalt erwünscht.

Niveau: ${level}. Mische richtig und falsch gleichmäßig.`
}
