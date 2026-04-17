// Промпт генерации для модуля Sprechen (3 задачи: planning/presentation/reaction).
// Шаблон в БД, этот файл — fallback.
// Плейсхолдеры: {level}, {topic_situation}, {topic_extra}, {seed}.

import type { ExamLevel } from '@/types/exam'
import type { TopicData } from '@/lib/topic-sampler'
import { getPrompt } from '@/lib/prompt-store'

export const PROMPT_KEY = 'generation/sprechen'

export const FALLBACK_TEMPLATE = `Erstelle das Modul Sprechen für das Goethe-Zertifikat {level}.

ANFORDERUNGEN:
Erstelle genau 3 Aufgaben:

1. Teil 1 — Gemeinsam etwas planen (type: "planning"):
   - Ein alltägliches Thema, das zwei Personen zusammen planen
   - Genau 4 Diskussionspunkte (Was? Wann? Wo? Wie?)
   - Beispiel: "Einen gemeinsamen Ausflug planen"

2. Teil 2 — Ein Thema präsentieren (type: "presentation"):
   - Ein Thema für eine kurze Präsentation
   - Genau 5 Punkte als Folien-Stichworte:
     Folie 1: Thema nennen / eigene Erfahrung
     Folie 2: Situation im Heimatland / in Deutschland
     Folie 3: Vorteile
     Folie 4: Nachteile
     Folie 5: Eigene Meinung / Zusammenfassung
   - Beispiel: "Soziale Medien im Alltag"

3. Teil 3 — Auf eine Präsentation reagieren (type: "reaction"):
   - Eine Frage oder ein Kommentar als Reaktion auf die Präsentation aus Teil 2
   - 2–3 Stichpunkte als Hilfe

VORGEGEBENER THEMATISCHER KONTEXT (verbindlich — orientiere dich daran):
- Leitsituation für eine der Aufgaben: {topic_situation}
- Zusatzdaten: {topic_extra}

Niveau: {level}.
Variations-Seed (nur intern, nicht im Text nennen): {seed}

Übergib das Ergebnis ausschließlich über das bereitgestellte Tool. Verwende authentisches, natürliches Deutsch — typografische Anführungszeichen („…") sind im Inhalt erwünscht.`

export async function buildSprechenPrompt(level: ExamLevel, topic: TopicData): Promise<string> {
  const template = await getPrompt(PROMPT_KEY, FALLBACK_TEMPLATE)
  const seed = Math.random().toString(36).slice(2, 8)

  return template
    .replaceAll('{level}', level)
    .replaceAll('{topic_situation}', topic.situation ?? 'Alltagsthema')
    .replaceAll('{topic_extra}', JSON.stringify(topic))
    .replaceAll('{seed}', seed)
}
