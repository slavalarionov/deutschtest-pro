'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'

const faqKeys = [
  'realism',
  'levels',
  'aiScoring',
  'singleModules',
  'microphone',
] as const

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const t = useTranslations('landing.faq')

  return (
    <section id="faq" className="bg-brand-white px-4 py-20">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-brand-text">
            {t('title')}
          </h2>
        </div>

        <div className="space-y-3">
          {faqKeys.map((key, i) => (
            <div
              key={key}
              className="rounded-xl border border-brand-border bg-brand-bg"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <span className="text-sm font-medium text-brand-text">
                  {t(`items.${key}.q`)}
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
                      {t(`items.${key}.a`)}
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
