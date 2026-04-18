'use client'

import { motion } from 'framer-motion'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import {
  PRICING_PACKAGES,
  currencyForLocale,
  fractionDigitsForAmount,
} from '@/lib/pricing'

export function PricingSection() {
  const t = useTranslations('landing.pricing')
  const locale = useLocale()
  const format = useFormatter()
  const currency = currencyForLocale(locale)

  return (
    <section id="pricing" className="bg-brand-bg px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-brand-text">
            {t('title')}
          </h2>
          <p className="text-brand-muted">{t('subtitle')}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {PRICING_PACKAGES.map((pkg, i) => {
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
              <motion.div
                key={pkg.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative rounded-xl p-8 ${
                  pkg.highlighted
                    ? 'border-2 border-brand-gold bg-brand-white shadow-card'
                    : 'border border-brand-border bg-brand-white'
                }`}
              >
                {pkg.hasBadge && (
                  <span className="absolute -top-3 right-4 rounded-full bg-brand-gold px-3 py-0.5 text-xs font-bold text-white">
                    {t(`${ns}.badge`)}
                  </span>
                )}

                <h3 className="mb-1 text-lg font-semibold text-brand-text">
                  {t(`${ns}.name`)}
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
                  {t(`${ns}.priceNote`)}
                </p>
                <ul className="mb-8 space-y-2">
                  {Array.from({ length: pkg.featureCount }, (_, idx) => idx + 1).map(
                    (n) => (
                      <li
                        key={n}
                        className="flex items-start gap-2 text-sm text-brand-text"
                      >
                        <span className="mt-0.5 text-brand-gold">✓</span>
                        {t(`${ns}.feature${n}`)}
                      </li>
                    )
                  )}
                </ul>
                <Link
                  href="/pricing"
                  className={`block w-full rounded-lg py-2.5 text-center text-sm font-medium transition ${
                    pkg.highlighted
                      ? 'bg-brand-gold text-white hover:bg-brand-gold-dark'
                      : 'border border-brand-border bg-brand-bg text-brand-text hover:bg-brand-surface'
                  }`}
                >
                  {t('ctaBuy')}
                </Link>
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mx-auto mt-10 max-w-2xl rounded-xl border border-green-200 bg-green-50 px-6 py-5 text-center"
        >
          <p className="text-sm font-medium text-green-900">
            {t('freeTrial.title')}
          </p>
          <Link
            href="/register"
            className="mt-3 inline-block rounded-lg bg-brand-gold px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-gold-dark"
          >
            {t('freeTrial.cta')}
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
