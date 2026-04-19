// Промпт генерации Lesen Teil 3 (Regeltext + ja/nein). Шаблон в БД, файл — fallback.

import type { ExamLevel } from '@/types/exam'
import type { TopicData } from '@/lib/topic-sampler'
import { getPrompt } from '@/lib/prompt-store'

export const PROMPT_KEY = 'generation/lesen-teil3'

export const FALLBACK_TEMPLATE = `Erstelle Teil 3 des Moduls Lesen für das Goethe-Zertifikat {level}.

ANFORDERUNGEN:
- Schreibe einen Regeltext (Hausordnung, Bibliotheksregeln, Kursregeln, Vereinsregeln) (250–350 Wörter), Niveau {level}
- Konkretes Thema: {topic_situation}
- Kategorie: {topic_category}
- Erstelle genau 8 Aufgaben:
  - Aufgabe 0 ist ein Beispiel (isExample: true) mit Antwort "ja"
  - Aufgaben 12–18: Aussagen mit "ja" oder "nein"
  - Mischung: ca. Hälfte "ja", Hälfte "nein"

WICHTIG — Feld "isExample":
- Setze "isExample": true nur für die Beispielaufgabe (id 0).
- Setze "isExample": false für alle anderen Aufgaben.
- Niemals null. Immer genau true oder false.

Zusatzdaten zum Thema: {topic_extra}
Variations-Seed (nicht erwähnen): {seed}

Strukturiere die vollständige Antwort ausschließlich über das bereitgestellte Tool (kein JSON als Fließtext, kein zusätzlicher Erläuterungstext).`

export async function buildLesenTeil3Prompt(level: ExamLevel, topic: TopicData): Promise<string> {
  const template = await getPrompt(PROMPT_KEY, FALLBACK_TEMPLATE)
  const seed = Math.random().toString(36).slice(2, 8)

  return template
    .replaceAll('{level}', level)
    .replaceAll('{topic_situation}', topic.situation ?? 'Hausordnung')
    .replaceAll('{topic_category}', topic.category ?? 'Alltag')
    .replaceAll('{topic_extra}', JSON.stringify(topic))
    .replaceAll('{seed}', seed)
}
