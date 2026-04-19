import { getTranslations } from 'next-intl/server'

/**
 * Landing · FAQ section (Phase 3 editorial redesign).
 *
 * Follows the `LandingHow` editorial pattern from docs/Redesign.html (lines
 * 457-482): a static list where each item is a `border-t` row with mono
 * numbering (01..06) in a 1fr column and the answer body in a 2fr column.
 *
 * No accordion — every Q/A is visible at once, which matches the editorial
 * tone of the rest of the landing (no interactions, just reading). Therefore
 * a pure Server Component: no `useState`, no Framer Motion, no client bundle.
 *
 * i18n keys live under `landing.faq`; the six item keys are read in a fixed
 * order defined below (realism → aiScoring → officialExam → modulesPricing
 * → microphone → refund). The 01..06 numbering is a visual element, not
 * localized copy, so it is derived from the index at render time.
 */

const ITEMS = [
  'realism',
  'aiScoring',
  'officialExam',
  'modulesPricing',
  'microphone',
  'refund',
] as const

export async function FaqSection() {
  const t = await getTranslations('landing.faq')

  return (
    <section
      id="faq"
      className="bg-surface px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="mb-12 sm:mb-16 lg:mb-20">
          <div className="eyebrow mb-3">{t('eyebrow')}</div>
          <h2 className="font-display text-4xl leading-none tracking-tighter text-ink sm:text-5xl lg:text-[64px]">
            {t('titleStrong')}
            <br />
            <span className="text-muted">{t('titleMuted')}</span>
          </h2>
        </div>

        {/* Q/A list */}
        <div className="flex flex-col gap-8 sm:gap-10">
          {ITEMS.map((key, i) => (
            <div
              key={key}
              className="grid grid-cols-1 gap-4 border-t border-line pt-6 md:grid-cols-[1fr_2fr] md:gap-10 md:pt-8"
            >
              <div>
                <div className="mb-3 font-mono text-[11px] uppercase tracking-wide text-muted">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="font-display text-2xl leading-tight tracking-tight text-ink sm:text-[28px]">
                  {t(`items.${key}.q`)}
                </div>
              </div>
              <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
                {t(`items.${key}.a`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
