// Промпт генерации Hören Teil 4 (5 отдельных коротких диалогов). Шаблон в БД, файл — fallback.

import type { ExamLevel } from '@/types/exam'
import type { TopicData } from '@/lib/topic-sampler'
import { getPrompt } from '@/lib/prompt-store'

export const PROMPT_KEY = 'generation/horen-teil4'

export const FALLBACK_TEMPLATE = `Erstelle Teil 4 des Moduls Hören für das Goethe-Zertifikat {level}.

STRUKTUR: **5 getrennte kurze Dialoge** — jeweils **genau 2 verschiedene Sprecher** (nur 2 verschiedene role-Werte pro Script, abwechselnde Repliken).
Leitthema der Szenen-Serie: {topic_situation}
Vorschlag für die Szenen: {topic_scene}

EMPFOHLENE PAARE (Script-Reihenfolge IDs 8–12, Task-IDs 16–20):
- Dialog 1 (id 8): casual_male + casual_female
- Dialog 2 (id 9): professional_male + elderly_female
- Dialog 3 (id 10): casual_female + professional_female
- Dialog 4 (id 11): casual_male + professional_male
- Dialog 5 (id 12): child + casual_female (z. B. Mutter/Verkäuferin + Kind — nur **zwei** Stimmen im Dialog)

Über **alle 5 Dialoge** verteilt entsteht Vielfalt; **announcer** nur nutzen, wenn eine Szene wirklich eine **Durchsage** braucht — dann **trotzdem nur 2 Rollen pro Script**.

ANFORDERUNGEN:
- Je Dialog 40–80 Wörter, 4–10 Repliken.
- Pro Script genau 1 Richtig/Falsch-Aufgabe.
- playCount: 2 für jedes Script.
- Kein "script"/"voiceType".

emotion optional: neutral | happy | worried | angry | sad | polite

WICHTIG: Genau **5** Scripts (IDs 8–12). Pro Script **höchstens zwei** unterschiedliche "role"-Werte.

Zusatzdaten: {topic_extra}
Variations-Seed (nicht erwähnen): {seed}

Für jedes Hörscript wähle entweder "mode": "mono" oder "mode": "dialogue".

Übergib das Ergebnis ausschließlich über das bereitgestellte Tool. Verwende authentisches, natürliches Deutsch — typografische Anführungszeichen („…") sind im Inhalt erwünscht.

Niveau: {level}. Mische richtig und falsch.`

export async function buildHorenTeil4Prompt(level: ExamLevel, topic: TopicData): Promise<string> {
  const template = await getPrompt(PROMPT_KEY, FALLBACK_TEMPLATE)
  const seed = Math.random().toString(36).slice(2, 8)

  return template
    .replaceAll('{level}', level)
    .replaceAll('{topic_situation}', topic.situation ?? 'Fünf Alltagsdialoge')
    .replaceAll('{topic_scene}', topic.sceneHint ?? 'Bäcker, Bus, Bank, Büro, Bibliothek')
    .replaceAll('{topic_extra}', JSON.stringify(topic))
    .replaceAll('{seed}', seed)
}
