import type { Locale } from '@/i18n/request'

/**
 * Closed enum of learning topics. Mirrored 1:1 in:
 *   - the SQL CHECK constraint on learning_resources.topic (migration 027)
 *   - the Zod enum used to validate Claude's tool_use response
 *
 * Adding a tag = (1) write migration that ALTERs the constraint, (2) extend
 * this list, (3) regenerate types. Doing those three together prevents the
 * AI from emitting a tag the DB rejects.
 */
export const LEARNING_TAGS = [
  'modal-verben',
  'perfekt',
  'prateritum',
  'konjunktiv',
  'prapositionen',
  'cases',
  'briefe',
  'inhaltspunkte',
  'wortschatz',
  'aussprache',
  'dialoge',
  'texts-reading',
  'audio-listening',
  'general',
] as const

export type LearningTag = (typeof LEARNING_TAGS)[number]

export const TAG_LABELS: Record<LearningTag, Record<Locale, string>> = {
  'modal-verben': {
    de: 'Modalverben',
    ru: 'Модальные глаголы',
    en: 'Modal verbs',
    tr: 'Modal fiiller',
  },
  perfekt: {
    de: 'Perfekt',
    ru: 'Perfekt (прошедшее время)',
    en: 'Perfekt tense',
    tr: 'Perfekt zamanı',
  },
  prateritum: {
    de: 'Präteritum',
    ru: 'Präteritum (прошедшее)',
    en: 'Präteritum tense',
    tr: 'Präteritum zamanı',
  },
  konjunktiv: {
    de: 'Konjunktiv',
    ru: 'Konjunktiv (сослагательное)',
    en: 'Konjunktiv (subjunctive)',
    tr: 'Konjunktiv kipi',
  },
  prapositionen: {
    de: 'Präpositionen',
    ru: 'Предлоги',
    en: 'Prepositions',
    tr: 'Edatlar',
  },
  cases: {
    de: 'Kasus',
    ru: 'Падежи',
    en: 'Cases (Nom/Akk/Dat/Gen)',
    tr: 'Durumlar',
  },
  briefe: {
    de: 'Briefe schreiben',
    ru: 'Письма',
    en: 'Letter writing',
    tr: 'Mektup yazma',
  },
  inhaltspunkte: {
    de: 'Inhaltspunkte abdecken',
    ru: 'Раскрытие пунктов задания',
    en: 'Covering all task points',
    tr: 'Görev maddelerini kapsamak',
  },
  wortschatz: {
    de: 'Wortschatz',
    ru: 'Словарный запас',
    en: 'Vocabulary',
    tr: 'Kelime hazinesi',
  },
  aussprache: {
    de: 'Aussprache',
    ru: 'Произношение',
    en: 'Pronunciation',
    tr: 'Telaffuz',
  },
  dialoge: {
    de: 'Dialoge führen',
    ru: 'Ведение диалога',
    en: 'Holding dialogues',
    tr: 'Diyalog yürütme',
  },
  'texts-reading': {
    de: 'Lesetexte verstehen',
    ru: 'Понимание текстов',
    en: 'Reading comprehension',
    tr: 'Okuduğunu anlama',
  },
  'audio-listening': {
    de: 'Hörverstehen',
    ru: 'Аудирование',
    en: 'Listening comprehension',
    tr: 'Dinlediğini anlama',
  },
  general: {
    de: 'Allgemein',
    ru: 'Общее',
    en: 'General',
    tr: 'Genel',
  },
}

export function getTagLabel(tag: string, locale: Locale): string {
  if (LEARNING_TAGS.includes(tag as LearningTag)) {
    return TAG_LABELS[tag as LearningTag][locale]
  }
  return tag
}
