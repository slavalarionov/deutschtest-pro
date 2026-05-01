import { getTranslations } from 'next-intl/server'

/**
 * Manifesto · "Цена ошибки велика."
 *
 * Anchors the price perception: the real Goethe-Institut exam costs 10 500 ₽
 * and up — our 160 ₽ for all four modules is positioned against that reality.
 *
 * Russian-style price formatting (space thousand separator + ₽) is used in
 * every locale because:
 *   1. The audience is Russian-speaking across all four locales (Russia, CIS,
 *      Russian-speakers in Germany / Turkey).
 *   2. The argument — "passing A1 at Goethe-Institut in Russia costs N times
 *      more than our entire prep" — is locale-agnostic.
 *
 * Layout: two-column on lg+ (left = manifesto copy, right = Goethe price card),
 * full-width black banner below comparing 160 ₽ to A1 Goethe.
 */

const GOETHE_PRICES: Array<{
  level: string
  total: number
  perModule: number | null
}> = [
  { level: 'A1', total: 10_500, perModule: null },
  { level: 'A2', total: 11_000, perModule: null },
  { level: 'B1', total: 14_600, perModule: 4_700 },
  { level: 'B2', total: 16_000, perModule: 5_200 },
  { level: 'C1', total: 18_500, perModule: 6_000 },
]

const rubFormatter = new Intl.NumberFormat('ru-RU')
const formatRub = (n: number) => `${rubFormatter.format(n)} ₽`

export async function ManifestoSection() {
  const t = await getTranslations('landing.manifesto')

  return (
    <section
      id="manifesto"
      className="bg-page px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="eyebrow mb-8 sm:mb-12">{t('eyebrow')}</div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: manifesto copy */}
          <div>
            <h2 className="font-display text-4xl leading-none tracking-tighter text-ink sm:text-5xl lg:text-[64px]">
              {t('title')}
            </h2>
            <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-soft sm:mt-10 sm:text-lg">
              <p>{t('p1')}</p>
              <p>{t('p2')}</p>
              <p>
                {t.rich('p3', {
                  strong: (chunks) => (
                    <span className="font-medium text-ink">{chunks}</span>
                  ),
                })}
              </p>
            </div>
          </div>

          {/* Right: Goethe-Institut price table */}
          <div className="rounded-rad border border-line bg-card p-6 sm:p-8">
            <div>
              <h3 className="font-display text-2xl font-medium leading-tight tracking-tight text-ink sm:text-[28px]">
                {t('tableTitle')}
              </h3>
              <p className="mt-2 text-sm italic text-muted">
                {t('tableSubtitle')}
                <sup className="ml-0.5 not-italic">*</sup>
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between border-y border-line py-3 font-mono text-[11px] uppercase tracking-wide text-muted">
              <span>{t('tableHeaderLevel')}</span>
              <span>{t('tableHeaderPrice')}</span>
            </div>

            <ul className="divide-y divide-line">
              {GOETHE_PRICES.map((row) => (
                <li
                  key={row.level}
                  className="flex items-baseline justify-between py-4"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-2xl tracking-tight text-ink sm:text-[28px]">
                      {row.level}
                    </span>
                    {row.perModule != null && (
                      <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
                        {formatRub(row.perModule)} {t('perModuleUnit')}
                      </span>
                    )}
                  </div>
                  <span className="font-display text-2xl tracking-tight text-ink sm:text-[28px]">
                    {formatRub(row.total)}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-xs leading-relaxed text-muted">
              <em>{t('footnote')}</em>
            </p>
          </div>
        </div>

        {/* Bottom: full-width banner — our price vs A1 Goethe */}
        <div className="mt-12 flex flex-col items-start gap-10 rounded-rad bg-ink p-8 text-card sm:mt-16 sm:p-12 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:p-16">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wide text-card/60">
              {t('bannerLabel')}
            </div>
            <div
              className="mt-2 font-display leading-none text-card"
              style={{ fontSize: 'clamp(64px, 10vw, 112px)', letterSpacing: '-0.04em' }}
            >
              160 ₽
            </div>
          </div>
          <p className="max-w-md text-2xl leading-snug text-card sm:text-3xl lg:text-right">
            {t.rich('bannerPhrase', {
              multiplier: (chunks) => (
                <span
                  className="font-display italic"
                  style={{
                    fontSize: 'clamp(56px, 7vw, 84px)',
                    fontWeight: 500,
                    letterSpacing: '-0.03em',
                  }}
                >
                  {chunks}
                </span>
              ),
            })}
          </p>
        </div>
      </div>
    </section>
  )
}
