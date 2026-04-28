'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { HERO_QUIZ_CARDS, type QuizCardType } from '@/lib/landing/quiz-cards'
import type { Locale } from '@/i18n/request'

interface HeroQuizProps {
  className?: string
}

/**
 * Interactive 10-question hero quiz that replaces the previous static
 * floating preview cards. The same component is rendered twice in
 * `HeroSection` (mobile column + desktop right column); each instance
 * keeps its own state but only one is visible at any breakpoint.
 */
export function HeroQuiz({ className = '' }: HeroQuizProps) {
  const t = useTranslations('landing.heroQuiz')
  const locale = useLocale() as Locale

  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)

  const isFinal = currentIndex >= HERO_QUIZ_CARDS.length
  const card = isFinal ? null : HERO_QUIZ_CARDS[currentIndex]
  const isAnswered = selectedOption !== null
  const isCorrect =
    isAnswered && card !== null && selectedOption === card.correctIndex

  const typeLabels: Record<QuizCardType, string> = {
    'verb-form': t('typeLabels.verb-form'),
    article: t('typeLabels.article'),
    'case-ending': t('typeLabels.case-ending'),
    translation: t('typeLabels.translation'),
  }

  function handleSelect(index: number) {
    if (isAnswered) return
    setSelectedOption(index)
  }

  function handleNext() {
    setCurrentIndex((i) => i + 1)
    setSelectedOption(null)
  }

  if (isFinal) {
    return (
      <div
        className={`relative rounded-rad border border-line bg-card p-6 shadow-lift lg:p-8 ${className}`}
        style={{ minHeight: 460 }}
      >
        <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-5 text-center">
          <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
            10 / 10
          </span>
          <h3 className="font-display text-2xl leading-tight text-ink lg:text-3xl">
            {t('final.title')}
          </h3>
          <p className="max-w-xs text-sm text-ink-soft lg:text-base">
            {t('final.subtitle')}
          </p>
          <Link
            href="/register"
            className="mt-2 inline-flex items-center gap-2 rounded-rad-pill bg-ink px-6 py-3 text-sm font-medium text-card transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            {t('final.cta')}
          </Link>
        </div>
      </div>
    )
  }

  if (!card) return null

  const feedbackText = isAnswered
    ? isCorrect
      ? card.feedback.correct[locale]
      : card.feedback.incorrect[locale]
    : ''

  const indexLabel = String(currentIndex + 1).padStart(2, '0')

  return (
    <div
      className={`relative rounded-rad border border-line bg-card p-6 shadow-lift lg:p-8 ${className}`}
      style={{ minHeight: 460 }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
          {indexLabel} — {typeLabels[card.type]}
        </span>
        <span
          className="rounded-rad-pill px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
          style={{
            background: 'var(--accent-soft)',
            color: 'var(--accent-ink)',
          }}
        >
          {card.level}
        </span>
      </div>

      <p className="font-display text-lg leading-snug text-ink lg:text-xl">
        {card.prompt}
      </p>

      <div className="mt-5 flex flex-col gap-2">
        {card.options.map((option, i) => {
          const isThisCorrect = i === card.correctIndex
          const isThisSelected = i === selectedOption

          let stateClass =
            'border-line bg-card text-ink hover:border-ink hover:bg-page'
          if (isAnswered) {
            if (isThisCorrect) {
              stateClass = 'border-success bg-success-soft text-success'
            } else if (isThisSelected) {
              stateClass = 'border-error bg-error-soft text-error'
            } else {
              stateClass = 'border-line bg-card text-muted'
            }
          }

          return (
            <button
              key={i}
              type="button"
              disabled={isAnswered}
              onClick={() => handleSelect(i)}
              className={`flex items-center gap-3 rounded-rad-sm border px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-default ${stateClass}`}
            >
              <span className="font-mono text-xs opacity-70">
                {String.fromCharCode(97 + i)}
              </span>
              <span className="flex-1">{option}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-5" style={{ minHeight: 120 }}>
        <div
          aria-live="polite"
          className={`transition-opacity duration-200 ${isAnswered ? 'opacity-100' : 'opacity-0'}`}
        >
          {isAnswered && (
            <>
              <div className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted">
                {t('feedbackLabel')}
              </div>
              <p className="text-xs leading-relaxed text-ink-soft lg:text-sm">
                {feedbackText}
              </p>
            </>
          )}
        </div>

        <div
          className={`mt-4 flex justify-end transition-opacity duration-200 ${
            isAnswered ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <button
            type="button"
            onClick={handleNext}
            disabled={!isAnswered}
            className="inline-flex items-center gap-1.5 rounded-rad-pill bg-ink px-4 py-2 text-xs font-medium text-card transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            {t('nextButton')}
            <svg
              width="12"
              height="12"
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
          </button>
        </div>
      </div>
    </div>
  )
}
