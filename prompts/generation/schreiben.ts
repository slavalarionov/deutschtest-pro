// Промпт генерации для модуля Schreiben.
// Шаблон хранится в БД (prompts/prompt_versions), этот файл — fallback.
// Сидер scripts/seed-prompts.ts пишет FALLBACK_TEMPLATE как v1 при первом прогоне.
//
// Плейсхолдеры:
//   {level}            — уровень экзамена (A1/A2/B1)
//   {word_count}       — ожидаемый объём текста в словах
//   {type_lines}       — подсказка по типу задания (email/brief vs forum)
//   {topic_situation}  — ситуация из sampler (generation_topics)
//   {topic_recipient}  — получатель (Freund, Kollege, ...)
//   {topic_extra}      — весь topic_data в JSON (для подсказки модели)
//   {seed}             — случайный seed (ломает prompt caching)

import type { ExamLevel } from '@/types/exam'
import type { TopicData } from '@/lib/topic-sampler'
import { getPrompt } from '@/lib/prompt-store'

export const PROMPT_KEY = 'generation/schreiben'

export const FALLBACK_TEMPLATE = `Erstelle das Modul Schreiben für das Goethe-Zertifikat {level}.

ANFORDERUNGEN:
{type_lines}
- Situation: Beschreibe den Kontext (wem schreibt man, warum). Nutze den vorgegebenen Kontext unten.
- Prompt: Die eigentliche Aufgabe
- requiredPoints: 3–4 inhaltliche Punkte, die der Text behandeln muss
- wordCount: ca. {word_count} Wörter
- samplePost: Bei Forumaufgaben — der Originalbeitrag, auf den geantwortet wird (optional)

Für Aufgaben vom Typ 'email' oder 'brief' gibt es kein Feld samplePost — du musst es nicht angeben und nicht als null setzen.

VORGEGEBENER THEMATISCHER KONTEXT (verbindlich — orientiere dich daran, variiere im Detail):
- Situation: {topic_situation}
- Empfänger: {topic_recipient}
- Zusatzdaten: {topic_extra}

Niveau: {level}
Variations-Seed (nur intern zur Diversifizierung, erwähne ihn nicht im Text): {seed}

Übergib das Ergebnis ausschließlich über das bereitgestellte Tool. Verwende authentisches, natürliches Deutsch — typografische Anführungszeichen („…") sind im Inhalt erwünscht.`

export async function buildSchreibenPrompt(level: ExamLevel, topic: TopicData): Promise<string> {
  const wordCounts: Record<ExamLevel, number> = { A1: 30, A2: 50, B1: 80 }
  const typeLines =
    level === 'B1'
      ? `- Erstelle genau 1 Schreiben-Aufgabe (Niveau B1; späteres Zwei-Aufgaben-Format ist nicht Teil dieses Prompts).
- Type: "email" oder "brief" (eine Aufgabe, wie aktuell in der App vorgesehen).`
      : `- Erstelle genau 1 Schreiben-Aufgabe (Niveau ${level}).
- Type: "email" oder "brief".`

  const template = await getPrompt(PROMPT_KEY, FALLBACK_TEMPLATE)
  const seed = Math.random().toString(36).slice(2, 8)

  return template
    .replaceAll('{level}', level)
    .replaceAll('{word_count}', String(wordCounts[level]))
    .replaceAll('{type_lines}', typeLines)
    .replaceAll('{topic_situation}', topic.situation ?? 'Alltagssituation')
    .replaceAll('{topic_recipient}', topic.recipient ?? 'eine bekannte Person')
    .replaceAll('{topic_extra}', JSON.stringify(topic))
    .replaceAll('{seed}', seed)
}
