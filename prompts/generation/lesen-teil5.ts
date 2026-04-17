// Промпт генерации Lesen Teil 5 (Lückentext a/b/c). Шаблон в БД, файл — fallback.

import type { ExamLevel } from '@/types/exam'
import type { TopicData } from '@/lib/topic-sampler'
import { getPrompt } from '@/lib/prompt-store'

export const PROMPT_KEY = 'generation/lesen-teil5'

export const FALLBACK_TEMPLATE = `Erstelle Teil 5 des Moduls Lesen für das Goethe-Zertifikat {level}.

ANFORDERUNGEN:
- Schreibe einen kurzen Text (150–200 Wörter) mit 7 Lücken, Niveau {level}
- Konkretes Thema/Textart: {topic_situation}
- Kategorie: {topic_category}
- Markiere Lücken im Text als ___(26)___, ___(27)___ usw.
- Erstelle genau 7 Lückenaufgaben:
  - Lücke 0 ist ein Beispiel (isExample: true)
  - Lücken 26–31 sind die echten Aufgaben
  - Jede Lücke hat 3 Optionen (a, b, c), nur eine passt grammatisch und semantisch

Zusatzdaten: {topic_extra}
Variations-Seed (nicht erwähnen): {seed}

Strukturiere die vollständige Antwort ausschließlich über das bereitgestellte Tool (kein JSON als Fließtext, kein zusätzlicher Erläuterungstext).`

export async function buildLesenTeil5Prompt(level: ExamLevel, topic: TopicData): Promise<string> {
  const template = await getPrompt(PROMPT_KEY, FALLBACK_TEMPLATE)
  const seed = Math.random().toString(36).slice(2, 8)

  return template
    .replaceAll('{level}', level)
    .replaceAll('{topic_situation}', topic.situation ?? 'Kurze Mitteilung')
    .replaceAll('{topic_category}', topic.category ?? 'Alltag')
    .replaceAll('{topic_extra}', JSON.stringify(topic))
    .replaceAll('{seed}', seed)
}
