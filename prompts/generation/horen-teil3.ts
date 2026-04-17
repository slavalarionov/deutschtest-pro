// Промпт генерации Hören Teil 3 (Radio-/Podcast-Interview). Шаблон в БД, файл — fallback.

import type { ExamLevel } from '@/types/exam'
import type { TopicData } from '@/lib/topic-sampler'
import { getPrompt } from '@/lib/prompt-store'

export const PROMPT_KEY = 'generation/horen-teil3'

export const FALLBACK_TEMPLATE = `Erstelle Teil 3 des Moduls Hören für das Goethe-Zertifikat {level}.

SZENARIO: **Radio-, Podcast- oder TV-Interview**.
Konkretes Thema des Interviews: {topic_situation}
Zusätzlicher Szenen-Hinweis: {topic_scene}

STRUKTUR — **maximal 2 Gesprächspartner** im eigentlichen Interview:
- **Moderation:** entweder professional_male **oder** professional_female (eine Moderator-Stimme durchgehend).
- **Gast:** genau eine weitere Person: **casual_female**, **casual_male** **oder** **elderly_female** (wähle eine passende Rolle).

OPTIONAL (Sender-Design):
- **Maximal 2 kurze Repliken** mit role **announcer** (nur Programmhinweis am Anfang und/oder Schluss), **kein** dritter Gesprächspartner im Interview selbst.
- **Kein** child in Teil 3 (wirkt selten natürlich im Format).

VERBOTEN im Hauptgespräch:
- Keine dritte „Interview"-Stimme.

ANFORDERUNGEN:
- 200–300 Wörter, 10–16 Repliken im "dialogue".
- 5 Richtig/Falsch-Aufgaben, Script ID 7, Task-IDs 11–15.
- Kein "script"/"voiceType".

emotion optional: neutral | happy | worried | angry | sad | polite

Zusatzdaten: {topic_extra}
Variations-Seed (nicht erwähnen): {seed}

Für jedes Hörscript wähle entweder "mode": "mono" oder "mode": "dialogue".

Übergib das Ergebnis ausschließlich über das bereitgestellte Tool. Verwende authentisches, natürliches Deutsch — typografische Anführungszeichen („…") sind im Inhalt erwünscht.

Niveau: {level}. Mische richtig und falsch.`

export async function buildHorenTeil3Prompt(level: ExamLevel, topic: TopicData): Promise<string> {
  const template = await getPrompt(PROMPT_KEY, FALLBACK_TEMPLATE)
  const seed = Math.random().toString(36).slice(2, 8)

  return template
    .replaceAll('{level}', level)
    .replaceAll('{topic_situation}', topic.situation ?? 'Interview zum Alltag')
    .replaceAll('{topic_scene}', topic.sceneHint ?? 'Radio-/Podcast-Interview')
    .replaceAll('{topic_extra}', JSON.stringify(topic))
    .replaceAll('{seed}', seed)
}
