import { z } from 'zod'

/**
 * Schema of `learning_resources.body` for resource_type='advice'.
 * Mirrored 1:1 in:
 *   - the SQL CHECK content_check (migration 034)
 *   - the admin upsert API zod schema (advice variant)
 *   - the parser/validator in scripts/build-learning-advice-migration.mjs
 */
export const LearningAdviceBodySchema = z.object({
  why: z.string().min(50, 'Раздел "почему" слишком короткий'),
  steps: z.array(z.string().min(20)).min(3).max(6),
  drill: z.string().min(50),
  avoid: z.string().min(30),
  progress: z.string().min(30),
})

export type LearningAdviceBody = z.infer<typeof LearningAdviceBodySchema>

export type AdviceLocale = 'ru' | 'de' | 'en' | 'tr'

export const ADVICE_SECTION_LABELS: Record<
  AdviceLocale,
  Record<keyof LearningAdviceBody, string>
> = {
  ru: {
    why: 'Почему это сложно сейчас',
    steps: 'Что делать на этой неделе',
    drill: 'Упражнение прямо сейчас',
    avoid: 'Чего избегать',
    progress: 'Признак прогресса',
  },
  de: {
    why: 'Warum das jetzt schwierig ist',
    steps: 'Was diese Woche zu tun ist',
    drill: 'Übung jetzt sofort',
    avoid: 'Was zu vermeiden ist',
    progress: 'Zeichen des Fortschritts',
  },
  en: {
    why: 'Why this is hard right now',
    steps: 'What to do this week',
    drill: 'Exercise right now',
    avoid: 'What to avoid',
    progress: 'Signs of progress',
  },
  tr: {
    why: 'Şu anda neden zor',
    steps: 'Bu hafta yapılacaklar',
    drill: 'Hemen şimdi alıştırma',
    avoid: 'Kaçınılması gerekenler',
    progress: 'İlerleme işareti',
  },
}

export function getAdviceSectionLabels(locale: string): Record<keyof LearningAdviceBody, string> {
  if (locale in ADVICE_SECTION_LABELS) {
    return ADVICE_SECTION_LABELS[locale as AdviceLocale]
  }
  return ADVICE_SECTION_LABELS.en
}
