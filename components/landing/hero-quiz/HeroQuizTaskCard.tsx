'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import type { QuizCard, QuizCardType } from './quiz-cards'

/**
 * Replace gap markers in a quiz prompt with a single horizontal rule:
 * - `___` (3+ underscores, standalone)  → wide line for a missing word
 * - `__`  (2 underscores, glued to word) → short line for a missing suffix
 *
 * Renders as styled spans so the gap reads unambiguously as "fill in" rather
 * than as literal underscores. Stays inline with the surrounding text.
 */
function renderPrompt(prompt: string): ReactNode {
  const parts = prompt.split(/(_{3,}|_{2})/g)
  return parts.map((part, i) => {
    if (/^_{3,}$/.test(part)) {
      return (
        <span
          key={i}
          aria-hidden="true"
          className="mx-0.5 inline-block h-[1.5px] w-12 translate-y-[-3px] rounded-rad-pill bg-ink"
        />
      )
    }
    if (/^_{2}$/.test(part)) {
      return (
        <span
          key={i}
          aria-hidden="true"
          className="mx-0.5 inline-block h-[1.5px] w-4 translate-y-[-3px] rounded-rad-pill bg-ink"
        />
      )
    }
    return <span key={i}>{part}</span>
  })
}

interface HeroQuizTaskCardProps {
  card: QuizCard
  index: number
  selectedOption: number | null
  isAnswered: boolean
  onAnswer: (idx: number) => void
  onNext: () => void
  className?: string
}

export function HeroQuizTaskCard({
  card,
  index,
  selectedOption,
  isAnswered,
  onAnswer,
  onNext,
  className = '',
}: HeroQuizTaskCardProps) {
  const t = useTranslations('landing.heroQuiz')
  const indexLabel = String(index + 1).padStart(2, '0')

  const typeLabels: Record<QuizCardType, string> = {
    'verb-form': t('typeLabels.verb-form'),
    article: t('typeLabels.article'),
    'case-ending': t('typeLabels.case-ending'),
    translation: t('typeLabels.translation'),
  }

  return (
    <div
      className={`rounded-rad-sm border border-line bg-card p-4 shadow-lift ${className}`}
      style={{ minHeight: 180 }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
          {typeLabels[card.type]} · {card.level} · {t('aufgabeLabel')}{' '}
          {indexLabel} / 10
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-rad-pill px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide"
          style={{
            background: 'var(--accent-soft)',
            color: 'var(--accent-ink)',
          }}
        >
          <span aria-hidden className="h-1 w-1 rounded-rad-pill bg-accent" />
          {t('liveBadge')}
        </span>
      </div>

      <p className="text-sm text-ink">{renderPrompt(card.prompt)}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {card.options.map((option, i) => {
          const isThisCorrect = i === card.correctIndex
          const isThisSelected = i === selectedOption

          let stateClass =
            'border-line bg-surface text-ink hover:border-ink hover:bg-card'
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
              onClick={() => onAnswer(i)}
              className={`inline-flex items-center gap-2 rounded-rad-pill border px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-default ${stateClass}`}
            >
              <span className="font-mono text-[10px] opacity-70">
                {String.fromCharCode(97 + i)}
              </span>
              <span>{option}</span>
            </button>
          )
        })}

        {isAnswered && (
          <button
            type="button"
            onClick={onNext}
            className="ml-auto inline-flex items-center gap-1 rounded-rad-sm px-2 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card"
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
        )}
      </div>
    </div>
  )
}
