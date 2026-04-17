// Промпт генерации Hören Teil 2 (durchgehender Dialog, 5 Mini-Szenen). Шаблон в БД, файл — fallback.

import type { ExamLevel } from '@/types/exam'
import type { TopicData } from '@/lib/topic-sampler'
import { getPrompt } from '@/lib/prompt-store'

export const PROMPT_KEY = 'generation/horen-teil2'

export const FALLBACK_TEMPLATE = `Erstelle Teil 2 des Moduls Hören für das Goethe-Zertifikat {level}.

STRUKTUR:
- **Ein** Script (ID 6), **ein** durchgehendes "dialogue"-Array, **eine** Audio-Datei (playCount 1).
- Inhalt = **5 kurze Dialogszenen hintereinander**.
- Leitsituation des Tages: {topic_situation}
- Vorschlag für Szenenfolge: {topic_scene}
- **Pro Szene: höchstens 2 verschiedene Sprecher** — genau **2 verschiedene role-Werte**, die sich abwechseln (kein dritter Charakter in derselben Szene).
- Von Szene zu Szene **wechselt das Paar** (andere Rollen-Kombination).

ROLLEN-POOL (nur diese Keys): casual_female, casual_male, professional_female, professional_male, announcer, elderly_female, child
— **Vielfalt über alle 5 Szenen**, nicht alle 7 in jeder Szene erzwingen.

ANFORDERUNGEN:
- Gesamt ca. 200–300 Wörter gesprochener Inhalt, pro Szene 3–6 Repliken (nur die zwei Stimmen).
- 5 Multiple-Choice-Aufgaben (a, b, c), Task-IDs 6–10 — **eine Frage soll sich auf den Inhalt einer der Szenen beziehen** (logisch verteilen).
- Kein "script"/"voiceType".

emotion optional: neutral | happy | worried | angry | sad | polite

VOR DEM ABSENDEN PRÜFEN: In jedem zusammenhängenden Mini-Dialogblock höchstens **zwei** unterschiedliche "role"-Werte.

Zusatzdaten: {topic_extra}
Variations-Seed (nicht erwähnen): {seed}

Für jedes Hörscript wähle entweder "mode": "mono" oder "mode": "dialogue". Mische die beiden Modi nicht innerhalb eines Scripts.

Übergib das Ergebnis ausschließlich über das bereitgestellte Tool. Verwende authentisches, natürliches Deutsch — typografische Anführungszeichen („…") sind im Inhalt erwünscht.

Niveau: {level}.`

export async function buildHorenTeil2Prompt(level: ExamLevel, topic: TopicData): Promise<string> {
  const template = await getPrompt(PROMPT_KEY, FALLBACK_TEMPLATE)
  const seed = Math.random().toString(36).slice(2, 8)

  return template
    .replaceAll('{level}', level)
    .replaceAll('{topic_situation}', topic.situation ?? 'Alltag in der Stadt')
    .replaceAll('{topic_scene}', topic.sceneHint ?? 'Bahnhof, Markt, Apotheke, Café, Museum')
    .replaceAll('{topic_extra}', JSON.stringify(topic))
    .replaceAll('{seed}', seed)
}
