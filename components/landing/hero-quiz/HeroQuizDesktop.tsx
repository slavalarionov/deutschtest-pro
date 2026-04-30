'use client'

import { useLocale } from 'next-intl'
import type { Locale } from '@/i18n/request'
import { HeroQuizFeedbackCard } from './HeroQuizFeedbackCard'
import { HeroQuizTaskCard } from './HeroQuizTaskCard'
import { HeroQuizFinalCard } from './HeroQuizFinalCard'
import { FINAL_FEEDBACK } from './quiz-cards'
import { useHeroQuizState } from './useHeroQuizState'

/**
 * Desktop-only quiz composition: mono-caption, ß grapheme behind, two
 * floating cards (KI-Feedback top-right, task/final bottom-right) so the
 * grapheme stays visible vertically between them. Renders inside the
 * lg-only right column of HeroSection.
 */
export function HeroQuizDesktop() {
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
    <div className="relative h-[520px] w-full">
      {/* Mono-caption — editorial anchor */}
      <div
        aria-hidden="true"
        className="absolute left-0 top-4 flex gap-2 font-mono text-[11px] text-muted"
      >
        <span>U+00DF</span>
        <span>·</span>
        <span>LATIN SMALL LETTER SHARP S</span>
      </div>

      {/* ß grapheme — main art object */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div
          className="font-display leading-none text-ink"
          style={{ fontSize: 520, letterSpacing: '-0.06em', fontWeight: 400 }}
        >
          ß
        </div>
      </div>

      {/* Top: KI-Feedback — slight leftward shift, sits above the upper half of the ß. */}
      <HeroQuizFeedbackCard
        text={feedbackText}
        className="absolute right-2 top-10 z-20 w-72"
      />

      {/* Bottom: task / final — deeper leftward shift, overlaps the lower half of the ß
          ("заходит на половину буквы"). The two cards form a stair-step composition. */}
      {isFinal ? (
        <HeroQuizFinalCard
          correctCount={correctCount}
          className="absolute bottom-10 right-20 z-10 w-[360px]"
        />
      ) : card ? (
        <HeroQuizTaskCard
          card={card}
          index={currentIndex}
          selectedOption={selectedOption}
          isAnswered={isAnswered}
          onAnswer={handleAnswer}
          onNext={handleNext}
          className="absolute bottom-10 right-20 z-10 w-[360px]"
        />
      ) : null}
    </div>
  )
}
