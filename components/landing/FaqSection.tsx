'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const faqs = [
  {
    q: 'Wie realistisch sind die Prüfungen?',
    a: 'Unsere KI generiert Aufgaben, die exakt dem Format und Schwierigkeitsgrad des offiziellen Goethe-Zertifikats entsprechen. Format, Timing und Bewertungskriterien werden 1:1 nachgebildet.',
  },
  {
    q: 'Welche Niveaustufen werden unterstützt?',
    a: 'Aktuell unterstützen wir A1 (Start Deutsch 1), A2 (Goethe-Zertifikat A2) und B1 (Goethe-Zertifikat B1). Weitere Stufen sind in Planung.',
  },
  {
    q: 'Wie funktioniert die KI-Bewertung?',
    a: 'Lesen und Hören werden automatisch bewertet. Für Schreiben und Sprechen analysiert die KI Ihre Antworten nach den offiziellen Goethe-Bewertungskriterien und gibt detailliertes Feedback.',
  },
  {
    q: 'Kann ich einzelne Module üben?',
    a: 'Ja, Sie können sowohl eine vollständige Prüfung ablegen als auch einzelne Module (Lesen, Hören, Schreiben oder Sprechen) separat üben.',
  },
  {
    q: 'Brauche ich ein Mikrofon für das Sprechen-Modul?',
    a: 'Ja, für das Sprechen-Modul benötigen Sie ein Mikrofon. Die meisten Laptops und Smartphones haben ein eingebautes Mikrofon, das ausreicht.',
  },
] as const

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="bg-brand-white px-4 py-20">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-brand-text">
            Häufige Fragen
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-xl border border-brand-border bg-brand-bg"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <span className="text-sm font-medium text-brand-text">
                  {faq.q}
                </span>
                <span
                  className={`ml-4 text-brand-muted transition-transform ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                >
                  ▾
                </span>
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-4 text-sm leading-relaxed text-brand-muted">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
