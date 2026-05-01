'use client'

import { useTranslations } from 'next-intl'

export interface AnswerDetail {
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
}

export interface AnswersSummary {
  correct: number
  total: number
  score: number
}

interface Props {
  details: Record<string, AnswerDetail>
  summary: AnswersSummary
  /** When true, hide the "all correct" celebration line (used on history). */
  hideAllCorrectBadge?: boolean
}

export function ReadingListeningAnswersTable({
  details,
  summary,
  hideAllCorrectBadge,
}: Props) {
  const t = useTranslations('results.lesenHoren')
  const tDetail = useTranslations('dashboard.testDetail')
  const tHistory = useTranslations('dashboard.testDetail.lesenHoren')

  const entries = Object.entries(details)
  const wrongCount = summary.total - summary.correct

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="rounded-rad border border-line bg-surface p-8">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {tDetail('overviewEyebrow')}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-0">
          <StatPill
            value={String(summary.correct)}
            label={t('correct').toUpperCase()}
          />
          <div className="border-l border-line pl-8">
            <StatPill
              value={String(wrongCount)}
              label={t('wrong').toUpperCase()}
              muted={wrongCount > 0}
            />
          </div>
          <div className="border-l border-line pl-8">
            <StatPill
              value={String(summary.total)}
              label={t('total').toUpperCase()}
              soft
            />
          </div>
        </div>
        {!hideAllCorrectBadge && wrongCount === 0 && (
          <div className="mt-5 font-mono text-[11px] uppercase tracking-widest text-accent-ink">
            {tHistory('allCorrect')}
          </div>
        )}
      </div>

      {/* All answers */}
      <div className="rounded-rad border border-line bg-card p-6 sm:p-8">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {tDetail('allAnswersEyebrow')}
        </div>
        <table className="mt-4 w-full font-mono text-sm tabular-nums">
          <thead>
            <tr className="border-b border-line text-[10px] uppercase tracking-widest text-muted">
              <th className="py-2 pr-4 text-left font-normal">
                {t('table.number')}
              </th>
              <th className="w-8 px-2 py-2 text-center font-normal">
                <span className="sr-only">{t('table.status')}</span>
              </th>
              <th className="px-3 py-2 text-left font-normal">
                {t('table.yourAnswer')}
              </th>
              <th className="py-2 pl-3 text-left font-normal">
                {t('table.correctAnswer')}
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([id, detail], i) => {
              const numericId = Number(id)
              const padded = Number.isFinite(numericId)
                ? String(numericId).padStart(2, '0')
                : String(i + 1).padStart(2, '0')
              return (
                <tr key={id} className="border-b border-line-soft last:border-b-0">
                  <td className="py-2 pr-4 text-muted">{padded}</td>
                  <td className="w-8 px-2 py-2 text-center">
                    {detail.isCorrect ? (
                      <span aria-label={t('correct')} className="text-accent-ink">
                        {'✓'}
                      </span>
                    ) : (
                      <span aria-label={t('wrong')} className="text-error">
                        {'✗'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-ink">{detail.userAnswer || '—'}</td>
                  <td
                    className={`py-2 pl-3 ${
                      detail.isCorrect ? 'text-muted' : 'text-ink-soft'
                    }`}
                  >
                    {detail.isCorrect ? '—' : detail.correctAnswer}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatPill({
  value,
  label,
  muted,
  soft,
}: {
  value: string
  label: string
  muted?: boolean
  soft?: boolean
}) {
  const valueColor = muted ? 'text-muted' : soft ? 'text-ink-soft' : 'text-ink'
  return (
    <div>
      <div className={`font-display text-3xl ${valueColor}`}>{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </div>
    </div>
  )
}
