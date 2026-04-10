'use client'

import { motion } from 'framer-motion'

const plans = [
  {
    name: 'Probe',
    price: 'Kostenlos',
    period: '',
    description: 'Testen Sie die Plattform mit einem kostenlosen Probeexamen.',
    features: [
      '1 Probeexamen (alle Module)',
      'KI-Bewertung',
      'Grundlegendes Feedback',
    ],
    cta: 'Kostenlos starten',
    highlighted: false,
  },
  {
    name: 'Premium',
    price: '€19',
    period: '/Monat',
    description: 'Unbegrenzte Prüfungen mit detailliertem KI-Feedback.',
    features: [
      'Unbegrenzte Prüfungen',
      'Alle Niveaustufen (A1–B1)',
      'Detailliertes KI-Feedback',
      'Fortschrittsanalyse',
      'Prioritäts-Support',
    ],
    cta: 'Premium wählen',
    highlighted: true,
  },
] as const

export function PricingSection() {
  return (
    <section id="pricing" className="bg-brand-bg px-4 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-brand-text">
            Einfache Preisgestaltung
          </h2>
          <p className="text-brand-muted">
            Starten Sie kostenlos, upgraden Sie wenn Sie bereit sind.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
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
                {plan.name}
              </h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-brand-text">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm text-brand-muted">{plan.period}</span>
                )}
              </div>
              <p className="mb-6 text-sm text-brand-muted">
                {plan.description}
              </p>
              <ul className="mb-8 space-y-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-brand-text"
                  >
                    <span className="mt-0.5 text-brand-gold">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className={`w-full rounded-lg py-2.5 text-sm font-medium transition ${
                  plan.highlighted
                    ? 'bg-brand-gold text-white hover:bg-brand-gold-dark'
                    : 'border border-brand-border bg-brand-bg text-brand-text hover:bg-brand-surface'
                }`}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
