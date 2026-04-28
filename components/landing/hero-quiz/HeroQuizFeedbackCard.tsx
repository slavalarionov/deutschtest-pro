'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

interface HeroQuizFeedbackCardProps {
  text: string
  className?: string
}

export function HeroQuizFeedbackCard({
  text,
  className = '',
}: HeroQuizFeedbackCardProps) {
  const t = useTranslations('landing.heroQuiz')

  return (
    <div
      className={`rounded-rad-sm border border-line bg-card p-4 shadow-lift ${className}`}
      style={{ minHeight: 140 }}
    >
      <div className="mb-2 flex items-center gap-2">
        <svg
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className="text-accent"
        >
          <path
            d="M10 2l1.8 5.2L17 9l-5.2 1.8L10 16l-1.8-5.2L3 9l5.2-1.8L10 2z"
            fill="currentColor"
          />
        </svg>
        <span className="text-xs font-medium text-ink">
          {t('feedbackLabel')}
        </span>
      </div>
      <div aria-live="polite" className="relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={text}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="text-xs leading-relaxed text-ink-soft"
          >
            {text}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}
