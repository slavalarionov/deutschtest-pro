// Промпт скоринга Schreiben. Шаблон в БД (prompts.key = 'scoring/schreiben-score'),
// этот файл — fallback. Плейсхолдеры: {level}, {task}, {required_points}, {user_text}.

import type { ExamLevel } from '@/types/exam'
import { getPrompt } from '@/lib/prompt-store'

export const PROMPT_KEY = 'scoring/schreiben-score'

export const FALLBACK_TEMPLATE = `Du bist ein offizieller Prüfer für das Goethe-Zertifikat {level}, Modul Schreiben.

AUFGABE war:
{task}

INHALTLICHE PUNKTE die behandelt werden sollten:
{required_points}

TEXT DES PRÜFLINGS:
\`\`\`
{user_text}
\`\`\`

Bewerte den Text nach den offiziellen Goethe-Bewertungskriterien:
1. Aufgabenerfüllung (0–25): Wurden alle Inhaltspunkte behandelt? Ist das Format korrekt?
2. Kohärenz (0–25): Ist der Text logisch aufgebaut? Gibt es Konnektoren?
3. Wortschatz (0–25): Passt der Wortschatz zum Niveau {level}? Ist er vielfältig?
4. Grammatik (0–25): Sind die grammatischen Strukturen korrekt? Passen sie zum Niveau?

Übergib deine Bewertung ausschließlich über das bereitgestellte Tool. Schreibe das Feedback im Kommentar auf authentischem Deutsch — typografische Anführungszeichen sind erlaubt.`

export async function buildSchreibenScorePrompt(
  level: ExamLevel,
  task: string,
  requiredPoints: string[],
  userText: string
): Promise<string> {
  const template = await getPrompt(PROMPT_KEY, FALLBACK_TEMPLATE)
  return template
    .replaceAll('{level}', level)
    .replaceAll('{task}', task)
    .replaceAll(
      '{required_points}',
      requiredPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')
    )
    .replaceAll('{user_text}', userText)
}
