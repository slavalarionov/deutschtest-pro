// Промпт генерации Lesen Teil 4 (Kleinanzeigen + Zuordnung).
// Шаблон в БД, этот файл — fallback.

import type { ExamLevel } from '@/types/exam'
import type { TopicData } from '@/lib/topic-sampler'
import { getPrompt } from '@/lib/prompt-store'

export const PROMPT_KEY = 'generation/lesen-teil4'

export const FALLBACK_TEMPLATE = `Erstelle Teil 4 des Moduls Lesen für das Goethe-Zertifikat {level}.

ANFORDERUNGEN:
- Erstelle 8 kurze Texte (Anzeigen, Aushänge, Hinweisschilder) mit je 30–60 Wörtern, Niveau {level}
- Übergeordnetes Themenfeld: {topic_situation}
- Kategorie: {topic_category}
- Texte haben IDs: "a" bis "h"
- Erstelle genau 8 Situationen:
  - Situation 0 ist ein Beispiel (isExample: true)
  - Situationen 19–25 sind die echten Aufgaben
  - Jede Situation beschreibt, was eine Person sucht/braucht
  - Die Antwort ist die ID des passenden Textes (a–h)
  - Jeder Text wird maximal einmal zugeordnet; manche Texte bleiben übrig

WICHTIG — Feld "isExample":
- Setze "isExample": true nur für die Beispielsituation (id 0).
- Setze "isExample": false für alle anderen Situationen.
- Niemals null. Immer genau true oder false.

Zusatzdaten: {topic_extra}
Variations-Seed (nicht erwähnen): {seed}

Strukturiere die vollständige Antwort ausschließlich über das bereitgestellte Tool (kein JSON als Fließtext, kein zusätzlicher Erläuterungstext).`

export async function buildLesenTeil4Prompt(level: ExamLevel, topic: TopicData): Promise<string> {
  const template = await getPrompt(PROMPT_KEY, FALLBACK_TEMPLATE)
  const seed = Math.random().toString(36).slice(2, 8)

  return template
    .replaceAll('{level}', level)
    .replaceAll('{topic_situation}', topic.situation ?? 'Kleinanzeigen')
    .replaceAll('{topic_category}', topic.category ?? 'Alltag')
    .replaceAll('{topic_extra}', JSON.stringify(topic))
    .replaceAll('{seed}', seed)
}
