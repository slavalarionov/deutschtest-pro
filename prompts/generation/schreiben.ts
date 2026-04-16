import type { ExamLevel } from '@/types/exam'

export function getSchreibenPrompt(level: ExamLevel): string {
  const wordCounts: Record<ExamLevel, number> = { A1: 30, A2: 50, B1: 80 }
  const wc = wordCounts[level]

  const typeLines =
    level === 'B1'
      ? `- Erstelle genau 1 Schreiben-Aufgabe (Niveau B1; späteres Zwei-Aufgaben-Format ist nicht Teil dieses Prompts).
- Type: "email" oder "brief" (eine Aufgabe, wie aktuell in der App vorgesehen).`
      : `- Erstelle genau 1 Schreiben-Aufgabe (Niveau ${level}).
- Type: "email" oder "brief".`

  return `Erstelle das Modul Schreiben für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
${typeLines}
- Situation: Beschreibe den Kontext (wem schreibt man, warum)
- Prompt: Die eigentliche Aufgabe
- requiredPoints: 3–4 inhaltliche Punkte, die der Text behandeln muss
- wordCount: ca. ${wc} Wörter
- samplePost: Bei Forumaufgaben — der Originalbeitrag, auf den geantwortet wird (optional)

Themen: Alltag, Freizeit, Arbeit, Wohnung, Reise, Kurs, Veranstaltung.
Niveau: ${level}

Übergib das Ergebnis ausschließlich über das bereitgestellte Tool. Verwende authentisches, natürliches Deutsch — typografische Anführungszeichen („…") sind im Inhalt erwünscht.`
}
