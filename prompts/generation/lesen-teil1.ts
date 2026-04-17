// Промпт генерации Lesen Teil 1 (Blogtext + richtig/falsch).
// Шаблон в БД, этот файл — fallback.
// Плейсхолдеры: {level}, {topic_situation}, {topic_category}, {topic_scene}, {topic_extra}, {seed}.

import type { ExamLevel } from '@/types/exam'
import type { TopicData } from '@/lib/topic-sampler'
import { getPrompt } from '@/lib/prompt-store'

export const PROMPT_KEY = 'generation/lesen-teil1'

export const FALLBACK_TEMPLATE = `Erstelle Teil 1 des Moduls Lesen für das Goethe-Zertifikat {level}.

ANFORDERUNGEN:
- Schreibe einen Blogbeitrag auf Deutsch (350–450 Wörter), Niveau {level}
- Thema: {topic_situation}
- Kategorie/Kontext: {topic_category}
- Zusätzlicher Hinweis zur Szene: {topic_scene}
- Erstelle genau 7 Aufgaben:
  - Aufgabe 0 ist ein Beispiel (isExample: true) mit Antwort "richtig"
  - Aufgaben 1–6: genau 3 "richtig" und 3 "falsch"
- Jede Aufgabe ist eine Aussage über den Text

Zusatzdaten zum Thema: {topic_extra}
Variations-Seed (nicht im Text erwähnen): {seed}

Strukturiere die vollständige Antwort ausschließlich über das bereitgestellte Tool (kein JSON als Fließtext, kein zusätzlicher Erläuterungstext).`

export async function buildLesenTeil1Prompt(level: ExamLevel, topic: TopicData): Promise<string> {
  const template = await getPrompt(PROMPT_KEY, FALLBACK_TEMPLATE)
  const seed = Math.random().toString(36).slice(2, 8)

  return template
    .replaceAll('{level}', level)
    .replaceAll('{topic_situation}', topic.situation ?? 'Alltagsthema')
    .replaceAll('{topic_category}', topic.category ?? 'Alltag')
    .replaceAll('{topic_scene}', topic.sceneHint ?? '—')
    .replaceAll('{topic_extra}', JSON.stringify(topic))
    .replaceAll('{seed}', seed)
}
