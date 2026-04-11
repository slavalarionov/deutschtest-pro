/**
 * ElevenLabs voice IDs for Hören dialogues (multilingual v2).
 * Подбираются в Voice Library: фильтр Language → German; при необходимости замените ID в кабинете ElevenLabs.
 */
export const VOICES = {
  /** Alltag, jüngere Sprecherin */
  casual_female: 'MF3mGyEYCl7XYWbV9V6O',
  /** Alltag, jüngerer Sprecher */
  casual_male: 'VR6AewLTigWG4xSOukaG',
  /** Radio, formelle Ansage, Interview-Moderation */
  professional_female: 'EXAVITQu4vr4xnSDxMaL',
  /** Radio, formelle Ansage, Interview-Moderation */
  professional_male: 'pNInz6obpgDQGcFmaJgB',
  /** Bahnhof, Flughafen, klare Durchsage */
  announcer: 'ThT5KcBeYPX3keUQqHPh',
  /** ältere Sprecherin */
  elderly_female: 'XB0fDUnXU5powFXDhCwa',
  /** jüngerer / kindlicher Klang (in Library prüfen) */
  child: 'XrExE9yKIg1WjnnlVkGX',
} as const

export type VoiceRole = keyof typeof VOICES

/** Alte Hören-Felder aus Phase 1 (ein Sprecher pro Text) */
export type LegacyHorenVoiceType =
  | 'male_professional'
  | 'female_professional'
  | 'male_casual'
  | 'female_casual'

const LEGACY_TO_ROLE: Record<LegacyHorenVoiceType, VoiceRole> = {
  male_professional: 'professional_male',
  female_professional: 'professional_female',
  male_casual: 'casual_male',
  female_casual: 'casual_female',
}

export function resolveVoiceId(voiceTypeOrRole: string): string {
  if (voiceTypeOrRole in VOICES) {
    return VOICES[voiceTypeOrRole as VoiceRole]
  }
  const legacy = LEGACY_TO_ROLE[voiceTypeOrRole as LegacyHorenVoiceType]
  if (legacy) return VOICES[legacy]
  return VOICES.professional_male
}
