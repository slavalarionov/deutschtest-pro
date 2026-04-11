/**
 * ElevenLabs voice IDs for Hören dialogues (multilingual v2).
 * Подбираются в Voice Library: фильтр Language → German; при необходимости замените ID в кабинете ElevenLabs.
 */
export const VOICES = {
  /** Alltag, jüngere Sprecherin */
  casual_female: 'NE7AIW5DoJ7lUosXV2KR',
  /** Alltag, jüngerer Sprecher */
  casual_male: 'sbJf8opzqSGRyRJzCVjD',
  /** Radio, formelle Ansage, Interview-Moderation */
  professional_female: 'zKHQdbB8oaQ7roNTiDTK',
  /** Radio, formelle Ansage, Interview-Moderation */
  professional_male: 'hdH6PoUhxxcZgDRKifb9',
  /** Bahnhof, Flughafen, klare Durchsage */
  announcer: 'iQ5dS7juUUF7zgIVf8ET',
  /** ältere Sprecherin */
  elderly_female: 'p2Wol3C7j3rHbfOrbL18',
  /** Kind / jüngerer Klang */
  child: '7Nj1UduP6iY6hWpEDibS',
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
