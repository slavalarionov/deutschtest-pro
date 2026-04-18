// Промпт скоринга Schreiben. Шаблон в БД (prompts.key = 'scoring/schreiben-score'),
// этот файл — fallback. Плейсхолдеры: {level}, {task}, {required_points}, {user_text},
// {language_reminder}.
//
// Changelog:
// - 2026-04-18 (Этап 6.5): добавлен параметр language (de/ru/en/tr). Текст
//   комментария в ai_feedback теперь на языке пользователя. Критерии Goethe,
//   названия модулей, уровни, компоненты письма и цитаты текста пользователя —
//   остаются на немецком. Последняя немецкая строка про «authentisches Deutsch»
//   удалена: инструкция о языке выносится в system prompt + вставляется
//   плейсхолдером {language_reminder} в начало user prompt.

import type { ExamLevel } from '@/types/exam'
import { getPrompt } from '@/lib/prompt-store'
import type { Locale } from '@/i18n/request'
import { LANGUAGE_NAME } from '@/prompts/recommendations'

export const PROMPT_KEY = 'scoring/schreiben-score'

export const FALLBACK_TEMPLATE = `{language_reminder}

Du bist ein offizieller Prüfer für das Goethe-Zertifikat {level}, Modul Schreiben.

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

Übergib deine Bewertung ausschließlich über das bereitgestellte Tool.`

function buildLanguageReminder(language: Locale): string {
  return `REMINDER: Write the \`comment\` field in ${LANGUAGE_NAME[language]} (code: "${language}").

KEEP IN GERMAN (do not translate these — they are Goethe exam terms):
- Module names: Lesen, Hören, Schreiben, Sprechen
- Teile: Teil 1, Teil 2, Teil 3, Teil 4, Teil 5
- Levels: A1, A2, B1
- Goethe-Zertifikat, DeutschTest.pro
- Schreiben assessment criteria: Aufgabenerfüllung, Kohärenz, Wortschatz, Grammatik
- Letter/email components: Anrede, Grußformel, Betreff
- Direct quotes from the student's text (anything you cite in quotes "…" or „…")

Everything else in the \`comment\` — descriptions, explanations, suggestions — must be in ${LANGUAGE_NAME[language]}.`
}

export async function buildSchreibenScorePrompt(
  level: ExamLevel,
  task: string,
  requiredPoints: string[],
  userText: string,
  language: Locale
): Promise<string> {
  const template = await getPrompt(PROMPT_KEY, FALLBACK_TEMPLATE)
  return template
    .replaceAll('{language_reminder}', buildLanguageReminder(language))
    .replaceAll('{level}', level)
    .replaceAll('{task}', task)
    .replaceAll(
      '{required_points}',
      requiredPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')
    )
    .replaceAll('{user_text}', userText)
}
