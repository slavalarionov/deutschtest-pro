// Промпт генерации для модуля Schreiben.
// Шаблон хранится в БД (prompts/prompt_versions), этот файл — fallback.
// Сидер scripts/seed-prompts.ts пишет FALLBACK_TEMPLATE как v1 при первом прогоне.
//
// Changelog:
// - v2 (2026-04-17): уровне-зависимые константы вынесены в плейсхолдеры
//   {required_points_text} и {register_hint}. Значения резолвятся в
//   lib/prompt-level-params.ts. Фикс: A1 больше не требует «3–4 Inhaltspunkte».
//
// Плейсхолдеры:
//   {level}                 — уровень экзамена (A1/A2/B1)
//   {word_count}            — ожидаемый объём текста в словах
//   {required_points_text}  — формат пунктов по уровню (A1/A2/B1)
//   {register_hint}         — регистр обращения (du/Sie) по уровню
//   {type_lines}            — подсказка по типу задания (email/brief vs forum)
//   {topic_situation}       — ситуация из sampler (generation_topics)
//   {topic_recipient}       — получатель (Freund, Kollege, ...)
//   {topic_extra}           — весь topic_data в JSON (для подсказки модели)
//   {seed}                  — случайный seed (ломает prompt caching)

import type { ExamLevel } from '@/types/exam'
import type { TopicData } from '@/lib/topic-sampler'
import { getPrompt } from '@/lib/prompt-store'
import { resolveLevelParams } from '@/lib/prompt-level-params'

export const PROMPT_KEY = 'generation/schreiben'

export const FALLBACK_TEMPLATE = `Erstelle das Modul Schreiben für das Goethe-Zertifikat {level}.

ANFORDERUNGEN:
{type_lines}
- Situation: Beschreibe den Kontext (wem schreibt man, warum). Nutze den vorgegebenen Kontext unten.
- Prompt: Die eigentliche Aufgabe
- requiredPoints: {required_points_text}
- wordCount: ca. {word_count} Wörter
- Register: {register_hint}
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
  const levelParams = resolveLevelParams('schreiben', level)

  let result = template
    .replaceAll('{level}', level)
    .replaceAll('{word_count}', String(wordCounts[level]))
    .replaceAll('{type_lines}', typeLines)
    .replaceAll('{topic_situation}', topic.situation ?? 'Alltagssituation')
    .replaceAll('{topic_recipient}', topic.recipient ?? 'eine bekannte Person')
    .replaceAll('{topic_extra}', JSON.stringify(topic))
    .replaceAll('{seed}', seed)

  for (const [key, value] of Object.entries(levelParams)) {
    result = result.replaceAll(`{${key}}`, String(value))
  }

  return result
}
