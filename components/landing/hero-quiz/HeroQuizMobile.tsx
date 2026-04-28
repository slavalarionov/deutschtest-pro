'use client'

import { useLocale } from 'next-intl'
import type { Locale } from '@/i18n/request'
import { HeroQuizFeedbackCard } from './HeroQuizFeedbackCard'
import { HeroQuizTaskCard } from './HeroQuizTaskCard'
import { HeroQuizFinalCard } from './HeroQuizFinalCard'
import { FINAL_FEEDBACK } from './quiz-cards'
import { useHeroQuizState } from './useHeroQuizState'

/**
 * Mobile-only quiz composition: mono-caption + KI-Feedback + ß as a
 * faint background between the two cards + task/final card. Lives between
 * primary CTA and stats-row; min-height keeps stats-row stable.
 */
export function HeroQuizMobile() {
  const locale = useLocale() as Locale
  const {
    card,
    isAnswered,
    isCorrect,
    isFinal,
    currentIndex,
    selectedOption,
    correctCount,
    handleAnswer,
    handleNext,
  } = useHeroQuizState()

  let feedbackText = ''
  if (isFinal) {
    const tier = correctCount >= 8 ? 'high' : correctCount >= 5 ? 'mid' : 'low'
    feedbackText = FINAL_FEEDBACK[tier][locale]
  } else if (card) {
    feedbackText = !isAnswered
      ? card.feedback.hint[locale]
      : isCorrect
        ? card.feedback.correct[locale]
        : card.feedback.incorrect[locale]
  }

  return (
    <div className="relative" style={{ minHeight: 460 }}>
      {/* Background ß — soft, between cards */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div
          className="font-display leading-none text-ink"
          style={{
            fontSize: 260,
            letterSpacing: '-0.06em',
            fontWeight: 400,
            opacity: 0.18,
          }}
        >
          ß
        </div>
      </div>

      {/* Mono-caption: short below md, full md+ — never wraps */}
      <div
        aria-hidden="true"
        className="relative z-10 mb-3 flex gap-2 whitespace-nowrap font-mono text-[11px] text-muted"
      >
        <span>U+00DF</span>
        <span>·</span>
        <span className="hidden sm:inline">LATIN SMALL LETTER SHARP S</span>
        <span className="sm:hidden">SHARP S</span>
      </div>

      <HeroQuizFeedbackCard text={feedbackText} className="relative z-10" />

      <div aria-hidden="true" className="h-20" />

      {isFinal ? (
        <HeroQuizFinalCard
          correctCount={correctCount}
          className="relative z-10"
        />
      ) : card ? (
        <HeroQuizTaskCard
          card={card}
          index={currentIndex}
          selectedOption={selectedOption}
          isAnswered={isAnswered}
          onAnswer={handleAnswer}
          onNext={handleNext}
          className="relative z-10"
        />
      ) : null}
    </div>
  )
}
