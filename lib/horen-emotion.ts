import { z } from 'zod'

/** Erlaubte Werte für dialogue[].emotion (Claude/API). */
const ALLOWED = [
  'neutral',
  'happy',
  'worried',
  'angry',
  'sad',
  'polite',
] as const

export type HorenDialogueEmotionAllowed = (typeof ALLOWED)[number]

/**
 * Strikte Schema-Definition für Tool Use: ein klarer Enum, keine Preprocessing,
 * keine Transformationen. Diese Schema wird über zod-to-json-schema in das
 * input_schema des Tools eingebettet, damit Claude die erlaubten Werte direkt
 * im Protokoll sieht.
 *
 * Optional, weil dialogue[].emotion vom Modell weggelassen werden kann.
 */
export const horenDialogueEmotionSchema = z.enum(ALLOWED).optional()

/**
 * Defensive Nachbearbeitung nach dem Tool-Aufruf: falls das Modell aus
 * irgendeinem Grund einen unerwarteten Wert zurückgibt, mappen wir auf
 * `undefined` (statt einen Fehler zu werfen).
 *
 * Wird in `generateHorenTeil` auf jede dialogue[].emotion angewendet,
 * BEVOR das Ergebnis weiter gereicht wird.
 */
export function normalizeDialogueEmotion(v: unknown): HorenDialogueEmotionAllowed | undefined {
  if (v == null) return undefined
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  if (s === '') return undefined
  return (ALLOWED as readonly string[]).includes(s)
    ? (s as HorenDialogueEmotionAllowed)
    : undefined
}
