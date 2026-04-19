import { getFormatter, getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import {
  PRICING_PACKAGES,
  currencyForLocale,
  fractionDigitsForAmount,
} from '@/lib/pricing'
import type { Locale } from '@/i18n/request'

/**
 * Landing · Pricing section (Phase 3 editorial redesign).
 *
 * Ports the `LandingPricing` section from docs/Redesign.html (lines 484-528):
 * three-column editorial grid, Standard package rendered as featured card
 * with inverted palette (`bg-ink text-card`), large display typography for
 * the price, checkmark feature list, and a free-tier CTA block below.
 *
 * Contract with `lib/pricing.ts` and the existing i18n keys stays 1:1 —
 * only the visual layer is rewritten. Purchase buttons are disabled until
 * Robokassa is wired up (see `pricing.ctaBuy` copy "Kaufen (bald verfügbar)").
 *
 * Server Component — no client hooks. Currency formatting goes through
 * `getFormatter` from `next-intl/server`, so the price reads locale-correct:
 * `7,20 €` (de/tr), `€7.20` (en), `400 ₽` (ru).
 */
export async function PricingSection() {
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('landing.pricing')
  const tPricing = await getTranslations('pricing')
  const format = await getFormatter()
  const currency = currencyForLocale(locale)

  return (
    <section
      id="pricing"
      className="bg-page px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="mb-10 flex flex-col gap-6 sm:mb-14 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div>
            <div className="eyebrow mb-3">{t('eyebrow')}</div>
            <h2 className="font-display text-4xl leading-none tracking-tighter text-ink sm:text-5xl lg:text-[64px]">
              {t('title')}
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-ink-soft lg:text-right">
            {t('subtitle')}
          </p>
        </div>

        {/* Pricing grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {PRICING_PACKAGES.map((pkg) => {
            const ns = `packages.${pkg.key}` as const
            const price = pkg.prices[currency]
            const originalPrice = pkg.originalPrices[currency]
            const priceStr = format.number(price, {
              style: 'currency',
              currency,
              minimumFractionDigits: fractionDigitsForAmount(price, currency),
              maximumFractionDigits: fractionDigitsForAmount(price, currency),
            })
            const originalPriceStr =
              originalPrice != null
                ? format.number(originalPrice, {
                    style: 'currency',
                    currency,
                    minimumFractionDigits: fractionDigitsForAmount(originalPrice, currency),
                    maximumFractionDigits: fractionDigitsForAmount(originalPrice, currency),
                  })
                : null

            const featured = pkg.highlighted

            return (
              <article
                key={pkg.key}
                className={[
                  'flex flex-col rounded-rad p-8',
                  featured
                    ? 'border border-ink bg-ink text-card'
                    : 'border border-line bg-card text-ink',
                ].join(' ')}
              >
                {/* Top row: package name + badge */}
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display text-xl tracking-tight">
                    {tPricing(`${ns}.name`)}
                  </span>
                  {pkg.hasBadge && (
                    <span
                      className={[
                        'rounded-rad-pill px-3 py-1 text-[11px] font-medium uppercase tracking-wide',
                        featured
                          ? 'bg-accent-soft text-accent-ink'
                          : 'border border-line-soft bg-surface text-ink-soft',
                      ].join(' ')}
                    >
                      {tPricing(`${ns}.badge`)}
                    </span>
                  )}
                </div>

                {/* Price block */}
                <div className="mt-6">
                  {originalPriceStr && (
                    <div
                      className={[
                        'font-mono text-xs line-through',
                        featured ? 'text-card/50' : 'text-muted',
                      ].join(' ')}
                    >
                      {originalPriceStr}
                    </div>
                  )}
                  <div
                    className="font-display leading-none"
                    style={{ fontSize: 72, letterSpacing: '-0.04em' }}
                  >
                    {priceStr}
                  </div>
                  <div
                    className={[
                      'mt-2 text-sm',
                      featured ? 'text-card/70' : 'text-ink-soft',
                    ].join(' ')}
                  >
                    {tPricing(`${ns}.priceNote`)}
                  </div>
                </div>

                {/* Features list */}
                <ul className="mt-8 flex-1 space-y-3">
                  {Array.from({ length: pkg.featureCount }, (_, idx) => idx + 1).map((n) => (
                    <li
                      key={n}
                      className={[
                        'flex items-start gap-3 text-sm',
                        featured ? 'text-card/80' : 'text-ink-soft',
                      ].join(' ')}
                    >
                      <CheckIcon
                        className={featured ? 'text-card/70' : 'text-ink'}
                      />
                      <span>{tPricing(`${ns}.feature${n}`)}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA — disabled until Robokassa is wired */}
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className={[
                    'mt-8 inline-flex items-center justify-center gap-2 rounded-rad-pill px-6 py-3 text-sm font-medium transition-opacity',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                    featured
                      ? 'bg-card text-ink'
                      : 'bg-ink text-card',
                  ].join(' ')}
                >
                  {tPricing('ctaBuy')}
                  <ArrowIcon />
                </button>
              </article>
            )
          })}
        </div>

        {/* Free-tier CTA block */}
        <div className="mx-auto mt-10 flex max-w-3xl flex-col items-start gap-4 rounded-rad border border-dashed border-line bg-card p-6 sm:mt-14 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-rad-pill bg-accent-soft text-accent-ink"
            >
              <SparkIcon />
            </span>
            <p className="text-sm leading-relaxed text-ink">
              {tPricing('freeTrial.title')}
            </p>
          </div>
          <Link
            href="/register"
            className="inline-flex flex-none items-center gap-2 rounded-rad-pill bg-ink px-5 py-2.5 text-sm font-medium text-card transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
          >
            {tPricing('freeTrial.cta')}
            <ArrowIcon />
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ---------- Inline icons (no new dependency) ---------- */

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={`mt-0.5 flex-none ${className}`}
    >
      <path
        d="M4 10.5l3.5 3.5L16 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 10h10M11 6l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 2l1.8 5.2L17 9l-5.2 1.8L10 16l-1.8-5.2L3 9l5.2-1.8L10 2z"
        fill="currentColor"
      />
    </svg>
  )
}
