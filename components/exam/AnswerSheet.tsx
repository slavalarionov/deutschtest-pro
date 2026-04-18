'use client'

import { useTranslations } from 'next-intl'
import { useExamStore } from '@/store/examStore'

interface AnswerSheetProps {
  questions: { id: string; label: string }[]
  options: string[]
}

export function AnswerSheet({ questions, options }: AnswerSheetProps) {
  const t = useTranslations('exam.answerSheet')
  const { answers, setAnswer } = useExamStore()

  return (
    <div className="rounded-xl bg-brand-white p-6 shadow-soft">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-muted">
        {t('title')}
      </h3>

      <div className="space-y-3">
        {questions.map((q) => (
          <div key={q.id} className="flex items-center gap-4">
            <span className="w-8 text-right text-sm font-medium text-brand-muted">
              {q.label}
            </span>
            <div className="flex gap-2">
              {options.map((option) => {
                const isSelected = answers[q.id] === option
                return (
                  <button
                    key={option}
                    onClick={() => setAnswer(q.id, option)}
                    className={`flex h-9 min-w-[36px] items-center justify-center rounded-lg border text-sm font-medium transition ${
                      isSelected
                        ? 'border-brand-gold bg-brand-gold text-white'
                        : 'border-brand-border bg-brand-bg text-brand-text hover:border-brand-gold/50'
                    }`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
