'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

const featureKeys = ['lesen', 'horen', 'schreiben', 'sprechen'] as const
const featureIcons: Record<(typeof featureKeys)[number], string> = {
  lesen: '📖',
  horen: '🎧',
  schreiben: '✍️',
  sprechen: '🗣',
}

export function FeaturesSection() {
  const t = useTranslations('landing.features')

  return (
    <section id="features" className="bg-brand-white px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-brand-text">
            {t('title')}
          </h2>
          <p className="text-brand-muted">{t('subtitle')}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {featureKeys.map((key, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-xl border border-brand-border bg-brand-bg p-6 transition hover:shadow-card"
            >
              <span className="mb-3 block text-2xl">{featureIcons[key]}</span>
              <h3 className="mb-2 text-lg font-semibold text-brand-text">
                {t(`items.${key}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-brand-muted">
                {t(`items.${key}.description`)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
