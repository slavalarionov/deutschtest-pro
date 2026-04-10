import type { ExamLevel } from '@/types/exam'

export function getSprechenScorePrompt(level: ExamLevel): string {
  return `Du bist ein offizieller Prüfer für das Goethe-Zertifikat ${level}, Modul Sprechen.

Bewerte die folgende Transkription der mündlichen Prüfung nach den offiziellen Goethe-Bewertungskriterien:

1. Aufgabenerfüllung (0-20): Wurden alle Punkte der Aufgabe behandelt?
2. Flüssigkeit (0-20): Spricht der Prüfling flüssig und zusammenhängend?
3. Wortschatz (0-20): Ist der Wortschatz dem Niveau ${level} angemessen?
4. Grammatik (0-20): Sind die grammatischen Strukturen korrekt?
5. Aussprache (0-20): Ist die Aussprache verständlich?

Antworte NUR mit validem JSON:
{
  "score": 0-100,
  "criteria": {
    "taskFulfillment": 0-20,
    "fluency": 0-20,
    "vocabulary": 0-20,
    "grammar": 0-20,
    "pronunciation": 0-20
  },
  "comment": "Detailliertes Feedback auf Deutsch..."
}

Hinweis: Du bewertest eine Transkription, daher kann Aussprache nur indirekt beurteilt werden.
Sei fair aber streng — wie ein echter Prüfer.`
}
