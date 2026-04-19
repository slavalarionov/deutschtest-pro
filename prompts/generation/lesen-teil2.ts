// Промпт генерации Lesen Teil 2 (Zeitungsartikel + Multiple Choice).
// Шаблон в БД, этот файл — fallback. Плейсхолдеры: {level}, {topic_*}, {seed}.

import type { ExamLevel } from '@/types/exam'
import type { TopicData } from '@/lib/topic-sampler'
import { getPrompt } from '@/lib/prompt-store'

export const PROMPT_KEY = 'generation/lesen-teil2'

export const FALLBACK_TEMPLATE = `Erstelle Teil 2 des Moduls Lesen für das Goethe-Zertifikat {level}.

ANFORDERUNGEN:
- Schreibe einen Zeitungsartikel auf Deutsch (400–500 Wörter), Niveau {level}
- Thema: {topic_situation}
- Rubrik/Kategorie: {topic_category}
- Erstelle genau 7 Aufgaben insgesamt:
  - Aufgabe 0 ist ein Beispiel (isExample: true)
  - Die Aufgaben mit den IDs 7–12 sind die sechs echten Multiple-Choice-Aufgaben
  - Jede hat 3 Optionen (a, b, c), nur eine ist korrekt
- Fragen beziehen sich auf verschiedene Absätze

WICHTIG — Feld "isExample":
- Setze "isExample": true nur für die Beispielaufgabe (id 0).
- Setze "isExample": false für alle anderen Aufgaben.
- Niemals null. Immer genau true oder false.

Zusatzdaten zum Thema: {topic_extra}
Variations-Seed (nicht im Text erwähnen): {seed}

Strukturiere die vollständige Antwort ausschließlich über das bereitgestellte Tool (kein JSON als Fließtext, kein zusätzlicher Erläuterungstext).`

export async function buildLesenTeil2Prompt(level: ExamLevel, topic: TopicData): Promise<string> {
  const template = await getPrompt(PROMPT_KEY, FALLBACK_TEMPLATE)
  const seed = Math.random().toString(36).slice(2, 8)

  return template
    .replaceAll('{level}', level)
    .replaceAll('{topic_situation}', topic.situation ?? 'Aktuelles Thema')
    .replaceAll('{topic_category}', topic.category ?? 'Lokales')
    .replaceAll('{topic_extra}', JSON.stringify(topic))
    .replaceAll('{seed}', seed)
}
