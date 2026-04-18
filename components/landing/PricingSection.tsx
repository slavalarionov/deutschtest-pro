'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

type PlanKey = 'probe' | 'premium'

const plans: {
  key: PlanKey
  featureCount: number
  highlighted: boolean
}[] = [
  { key: 'probe', featureCount: 3, highlighted: false },
  { key: 'premium', featureCount: 5, highlighted: true },
]

export function PricingSection() {
  const t = useTranslations('landing.pricing')

  return (
    <section id="pricing" className="bg-brand-bg px-4 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-brand-text">
            {t('title')}
          </h2>
          <p className="text-brand-muted">{t('subtitle')}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {plans.map((plan, i) => {
            const ns = `plans.${plan.key}`
            const period = t(`${ns}.period`)
            return (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className={`rounded-xl p-8 ${
                  plan.highlighted
                    ? 'border-2 border-brand-gold bg-brand-white shadow-card'
                    : 'border border-brand-border bg-brand-white'
                }`}
              >
                <h3 className="mb-1 text-lg font-semibold text-brand-text">
                  {t(`${ns}.name`)}
                </h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-brand-text">
                    {t(`${ns}.price`)}
                  </span>
                  {period && (
                    <span className="text-sm text-brand-muted">{period}</span>
                  )}
                </div>
                <p className="mb-6 text-sm text-brand-muted">
                  {t(`${ns}.description`)}
                </p>
                <ul className="mb-8 space-y-2">
                  {Array.from({ length: plan.featureCount }, (_, idx) => idx + 1).map(
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
                <button
                  className={`w-full rounded-lg py-2.5 text-sm font-medium transition ${
                    plan.highlighted
                      ? 'bg-brand-gold text-white hover:bg-brand-gold-dark'
                      : 'border border-brand-border bg-brand-bg text-brand-text hover:bg-brand-surface'
                  }`}
                >
                  {t(`${ns}.cta`)}
                </button>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
