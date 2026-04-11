import type { ExamLevel } from '@/types/exam'

export function getSchreibenPrompt(level: ExamLevel): string {
  const wordCounts: Record<ExamLevel, number> = { A1: 30, A2: 50, B1: 80 }
  const wc = wordCounts[level]

  return `Erstelle das Modul Schreiben für das Goethe-Zertifikat ${level}.

ANFORDERUNGEN:
- Erstelle genau 1 Schreibaufgabe
- Type: "email" oder "forum" (je nach Niveau)
- Situation: Beschreibe den Kontext (wem schreibt man, warum)
- Prompt: Die eigentliche Aufgabe
- requiredPoints: 3–4 inhaltliche Punkte, die der Text behandeln muss
- wordCount: ca. ${wc} Wörter
- samplePost: Bei Forumaufgaben — der Originalbeitrag, auf den geantwortet wird (optional)

Themen: Alltag, Freizeit, Arbeit, Wohnung, Reise, Kurs, Veranstaltung.
Niveau: ${level}

ANTWORTE NUR MIT VALIDEM JSON:
{
  "tasks": [
    {
      "id": 1,
      "type": "email",
      "situation": "Sie haben eine Anzeige für eine Wohnung gelesen und möchten...",
      "prompt": "Schreiben Sie eine E-Mail an den Vermieter.",
      "requiredPoints": ["sich vorstellen", "Fragen zur Wohnung stellen", "Besichtigungstermin vorschlagen"],
      "wordCount": ${wc}
    }
  ]
}`
}
