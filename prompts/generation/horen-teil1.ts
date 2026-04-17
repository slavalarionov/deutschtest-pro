// Промпт генерации Hören Teil 1 (kurze Mono-Durchsagen). Шаблон в БД, файл — fallback.

import type { ExamLevel } from '@/types/exam'
import type { TopicData } from '@/lib/topic-sampler'
import { getPrompt } from '@/lib/prompt-store'

export const PROMPT_KEY = 'generation/horen-teil1'

export const FALLBACK_TEMPLATE = `Erstelle Teil 1 des Moduls Hören für das Goethe-Zertifikat {level}.

ANFORDERUNGEN:
- 5 kurze Hörtexte (Durchsagen, Ansagen am Bahnhof/Flughafen, Nachrichten auf Anrufbeantworter, Radioansagen)
- Leitszenario für die Mischung: {topic_situation} ({topic_scene})
- Jeder Text: 40–80 Wörter, klar und deutlich formuliert
- Jeder Text: 1 Aufgabe Richtig/Falsch
- Jeder Text wird 2x abgespielt
- voiceType abwechselnd: male_professional, female_professional, male_casual, female_casual
- IDs der Scripts: 1–5, IDs der Tasks: 1–5

Zusatzdaten: {topic_extra}
Variations-Seed (nicht erwähnen): {seed}

Für jedes Hörscript wähle entweder "mode": "mono" (eine Person spricht — dann fülle "script" und "voiceType") oder "mode": "dialogue" (mehrere Personen — dann fülle "dialogue" als Liste von Repliken). Mische die beiden Modi nicht innerhalb eines Scripts.

Übergib das Ergebnis ausschließlich über das bereitgestellte Tool. Verwende authentisches, natürliches Deutsch — typografische Anführungszeichen („…") sind im Inhalt erwünscht.

Niveau: {level}. Mische richtig und falsch gleichmäßig.`

export async function buildHorenTeil1Prompt(level: ExamLevel, topic: TopicData): Promise<string> {
  const template = await getPrompt(PROMPT_KEY, FALLBACK_TEMPLATE)
  const seed = Math.random().toString(36).slice(2, 8)

  return template
    .replaceAll('{level}', level)
    .replaceAll('{topic_situation}', topic.situation ?? 'Alltägliche Durchsagen')
    .replaceAll('{topic_scene}', topic.sceneHint ?? 'Bahnhof/Flughafen/Supermarkt')
    .replaceAll('{topic_extra}', JSON.stringify(topic))
    .replaceAll('{seed}', seed)
}
