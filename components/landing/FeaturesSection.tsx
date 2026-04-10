'use client'

import { motion } from 'framer-motion'

const features = [
  {
    title: 'Lesen',
    description:
      'KI-generierte Lesetexte mit Multiple-Choice und Richtig/Falsch-Aufgaben — exakt wie im echten Goethe-Zertifikat.',
    icon: '📖',
  },
  {
    title: 'Hören',
    description:
      'Professionell vertonte Hörtexte mit realistischen Stimmen. Kein Zurückspulen — wie in der echten Prüfung.',
    icon: '🎧',
  },
  {
    title: 'Schreiben',
    description:
      'Schreibaufgaben mit KI-Bewertung nach offiziellen Kriterien: Aufgabenerfüllung, Kohärenz, Wortschatz, Grammatik.',
    icon: '✍️',
  },
  {
    title: 'Sprechen',
    description:
      'Mündliche Prüfung mit Sprachaufnahme und KI-Analyse. Aussprache, Flüssigkeit und Grammatik werden bewertet.',
    icon: '🗣',
  },
] as const

export function FeaturesSection() {
  return (
    <section id="features" className="bg-brand-white px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-brand-text">
            Alle vier Module. Eine Plattform.
          </h2>
          <p className="text-brand-muted">
            Jedes Modul folgt exakt dem Format des Goethe-Zertifikats.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-xl border border-brand-border bg-brand-bg p-6 transition hover:shadow-card"
            >
              <span className="mb-3 block text-2xl">{feature.icon}</span>
              <h3 className="mb-2 text-lg font-semibold text-brand-text">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-brand-muted">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
