import type { ExamLevel } from '@/types/exam'

export function getSchreibenScorePrompt(
  level: ExamLevel,
  task: string,
  requiredPoints: string[],
  userText: string
): string {
  return `Du bist ein offizieller Prüfer für das Goethe-Zertifikat ${level}, Modul Schreiben.

AUFGABE war:
${task}

INHALTLICHE PUNKTE die behandelt werden sollten:
${requiredPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

TEXT DES PRÜFLINGS:
\`\`\`
${userText}
\`\`\`

Bewerte den Text nach den offiziellen Goethe-Bewertungskriterien:
1. Aufgabenerfüllung (0–25): Wurden alle Inhaltspunkte behandelt? Ist das Format korrekt?
2. Kohärenz (0–25): Ist der Text logisch aufgebaut? Gibt es Konnektoren?
3. Wortschatz (0–25): Passt der Wortschatz zum Niveau ${level}? Ist er vielfältig?
4. Grammatik (0–25): Sind die grammatischen Strukturen korrekt? Passen sie zum Niveau?

Übergib deine Bewertung ausschließlich über das bereitgestellte Tool. Schreibe das Feedback im Kommentar auf authentischem Deutsch — typografische Anführungszeichen sind erlaubt.`
}
