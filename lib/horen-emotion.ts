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

/** null / unbekannte Strings → undefined, damit Zod nicht bricht. */
export function normalizeDialogueEmotionInput(v: unknown): unknown {
  if (v == null) return undefined
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  if (s === '') return undefined
  return (ALLOWED as readonly string[]).includes(s) ? s : undefined
}

export const horenDialogueEmotionSchema: z.ZodType<
  HorenDialogueEmotionAllowed | undefined
> = z.preprocess(
  normalizeDialogueEmotionInput,
  z.enum(ALLOWED).optional()
) as z.ZodType<HorenDialogueEmotionAllowed | undefined>
