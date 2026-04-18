import { getFormatter, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import { checkUserCanTakeTest } from '@/lib/exam/limits'
import {
  PRICING_PACKAGES,
  currencyForLocale,
  fractionDigitsForAmount,
} from '@/lib/pricing'
import type { Locale } from '@/i18n/request'

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const t = await getTranslations('pricing')
  const tCommon = await getTranslations('common')
  const format = await getFormatter()

  const currency = currencyForLocale(locale)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let freeTestAvailable = false
  let paidTestsCount = 0

  if (user) {
    const availability = await checkUserCanTakeTest(user.id, user.email)
    freeTestAvailable = availability.freeTestAvailable
    paidTestsCount = availability.paidTestsCount
  }

  return (
    <main className="min-h-screen bg-brand-bg">
      <header className="flex items-center justify-between px-6 py-4 sm:px-10 sm:py-6">
        <Link href="/" className="text-lg font-bold text-brand-text">
          DeutschTest<span className="text-brand-gold">{tCommon('appNameHighlight')}</span>
        </Link>
        {user ? (
          <span className="text-sm text-brand-muted">
            {user.email}
          </span>
        ) : (
          <Link
            href="/login"
            className="rounded-lg border border-brand-border bg-brand-white px-4 py-2 text-sm font-medium text-brand-text shadow-soft transition hover:border-brand-gold/40"
          >
            {t('header.loginLink')}
          </Link>
        )}
      </header>

      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 text-center">
            <h1 className="mb-3 text-3xl font-bold text-brand-text sm:text-4xl">
              {t('title')}
            </h1>
            <p className="mx-auto max-w-xl text-brand-muted">
              {t('subtitle')}
            </p>
          </div>

          {user && freeTestAvailable && (
            <div className="mx-auto mb-10 max-w-md rounded-xl border border-green-200 bg-green-50 px-6 py-4 text-center">
              <p className="text-sm font-medium text-green-800">
                {t.rich('freeAvailable', {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </p>
              <Link
                href="/"
                className="mt-2 inline-block text-sm font-semibold text-brand-gold hover:text-brand-gold-dark"
              >
                {t('freeAvailableCta')}
              </Link>
            </div>
          )}

          {user && !freeTestAvailable && paidTestsCount > 0 && (
            <div className="mx-auto mb-10 max-w-md rounded-xl border border-brand-gold/30 bg-brand-gold/5 px-6 py-4 text-center">
              <p className="text-sm font-medium text-brand-text">
                {t.rich('paidAvailable', {
                  count: paidTestsCount,
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </p>
              <Link
                href="/"
                className="mt-2 inline-block text-sm font-semibold text-brand-gold hover:text-brand-gold-dark"
              >
                {t('paidAvailableCta')}
              </Link>
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-3">
            {PRICING_PACKAGES.map((pkg) => {
              const ns = `packages.${pkg.key}`
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

              return (
                <div
                  key={pkg.key}
                  className={`relative rounded-xl p-8 transition ${
                    pkg.highlighted
                      ? 'border-2 border-brand-gold bg-brand-white shadow-card'
                      : 'border border-brand-border bg-brand-white shadow-soft'
                  }`}
                >
                  {pkg.hasBadge && (
                    <span className="absolute -top-3 right-4 rounded-full bg-brand-gold px-3 py-0.5 text-xs font-bold text-white">
                      {t(`${ns}.badge` as const)}
                    </span>
                  )}

                  <h3 className="mb-1 text-lg font-semibold text-brand-text">
                    {t(`${ns}.name` as const)}
                  </h3>

                  <div className="mb-1">
                    {originalPriceStr && (
                      <span className="mr-2 text-sm text-brand-muted line-through">
                        {originalPriceStr}
                      </span>
                    )}
                    <span className="text-3xl font-bold text-brand-text">
                      {priceStr}
                    </span>
                  </div>

                  <p className="mb-6 text-xs text-brand-muted">
                    {t(`${ns}.priceNote` as const)}
                  </p>

                  <ul className="mb-8 space-y-2">
                    {Array.from({ length: pkg.featureCount }, (_, idx) => idx + 1).map(
                      (n) => (
                        <li
                          key={n}
                          className="flex items-start gap-2 text-sm text-brand-text"
                        >
                          <span className="mt-0.5 text-brand-gold">&#10003;</span>
                          {t(`${ns}.feature${n}` as const)}
                        </li>
                      )
                    )}
                  </ul>

                  <button
                    disabled
                    className={`w-full rounded-lg py-2.5 text-sm font-medium transition ${
                      pkg.highlighted
                        ? 'bg-brand-gold text-white hover:bg-brand-gold-dark disabled:opacity-80'
                        : 'border border-brand-border bg-brand-bg text-brand-text hover:bg-brand-surface disabled:opacity-80'
                    }`}
                  >
                    {t('ctaBuy')}
                  </button>
                </div>
              )
            })}
          </div>

          {!user && (
            <div className="mx-auto mt-10 max-w-2xl rounded-xl border border-green-200 bg-green-50 px-6 py-5 text-center">
              <p className="text-sm font-medium text-green-900">
                {t('freeTrial.title')}
              </p>
              <Link
                href="/register"
                className="mt-3 inline-block rounded-lg bg-brand-gold px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-gold-dark"
              >
                {t('freeTrial.cta')}
              </Link>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-brand-muted">
            {t('footnote')}
          </p>
        </div>
      </section>
    </main>
  )
}
