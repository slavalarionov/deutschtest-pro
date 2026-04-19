'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import { useState } from 'react'
import { RetakeModuleModal } from '@/components/exam/RetakeModuleModal'
import { formatEditorialDate } from '@/lib/format/date'
import type {
  TestDetails,
  LesenHorenAttemptFeedback,
} from '@/lib/dashboard/test-details'
import type {
  SchreibenContent,
  SchreibenFeedback,
  SprechenContent,
  SprechenFeedback,
} from '@/types/exam'

/** Flat progress bar on `--line` with an `--accent` fill. No score-gradation. */
function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="mt-3 h-2 overflow-hidden rounded-rad-pill bg-line">
      <div
        className="h-full rounded-rad-pill bg-accent"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

interface TestDetailsViewProps {
  details: TestDetails
  modulesBalance: number
}

export function TestDetailsView({
  details,
  modulesBalance,
}: TestDetailsViewProps) {
  const t = useTranslations('dashboard.testDetail')
  const tStatus = useTranslations('dashboard.history.table')
  const tModules = useTranslations('modules')
  const locale = useLocale()
  const [retakeOpen, setRetakeOpen] = useState(false)

  const moduleLabel = tModules(details.module)
  const formattedDate = formatEditorialDate(details.submittedAt, locale)
  const passed = details.passed

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      {/* ====== Back link ====== */}
      <div>
        <Link
          href="/dashboard/history"
          className="text-sm text-ink-soft transition-colors hover:text-ink"
        >
          {t('backToHistory')}
        </Link>
      </div>

      {/* ====== Editorial header ====== */}
      <header className="space-y-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {t('eyebrow', { level: details.level })}
        </div>
        <h1 className="font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
          {moduleLabel}.
          <br />
          <span className="text-ink-soft">{formattedDate}.</span>
        </h1>
      </header>

      {/* ====== Score card ====== */}
      <div className="rounded-rad border border-line bg-card p-10 text-center sm:p-14">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {t('resultEyebrow')}
        </div>
        <div className="mt-3 font-display text-7xl leading-none tracking-[-0.04em] text-ink md:text-8xl">
          {details.score}
        </div>
        <div className="mt-2 font-mono text-xl text-ink-soft">/ 100</div>

        <div className="mx-auto mt-6 h-2 w-64 overflow-hidden rounded-rad-pill bg-line">
          <div
            className={`h-full rounded-rad-pill ${passed ? 'bg-accent' : 'bg-ink'}`}
            style={{ width: `${Math.min(details.score, 100)}%` }}
          />
        </div>

        <div className="mt-6 inline-flex items-center gap-2 text-sm">
          <span
            aria-hidden="true"
            className={`block h-1.5 w-1.5 rounded-full ${passed ? 'bg-accent' : 'bg-muted'}`}
          />
          <span className={passed ? 'text-ink-soft' : 'text-muted'}>
            {passed
              ? tStatus('statusBestanden')
              : tStatus('statusNichtBestanden')}
          </span>
        </div>

        <div className="mt-4 font-mono text-xs uppercase tracking-widest text-muted">
          {formattedDate}
        </div>
      </div>

      {/* ====== Module-specific section ====== */}
      {(details.module === 'lesen' || details.module === 'horen') && (
        <LesenHorenSection feedback={details.feedback} />
      )}

      {details.module === 'schreiben' && (
        <SchreibenSection
          feedback={details.feedback}
          content={details.content}
        />
      )}

      {details.module === 'sprechen' && (
        <SprechenSection
          feedback={details.feedback}
          content={details.content}
        />
      )}

      {/* ====== Footer action ====== */}
      <div className="flex flex-col items-center gap-3 pt-6">
        <button
          type="button"
          disabled={modulesBalance === 0}
          aria-label={modulesBalance === 0 ? t('retakeDisabled') : undefined}
          title={modulesBalance === 0 ? t('retakeDisabled') : undefined}
          onClick={() => {
            if (modulesBalance > 0) setRetakeOpen(true)
          }}
          className={`rounded-rad-pill px-8 py-3 text-sm font-medium transition-colors ${
            modulesBalance > 0
              ? 'bg-ink text-page hover:bg-ink/90'
              : 'cursor-not-allowed bg-line text-muted'
          }`}
        >
          {t('retakeModule')}
        </button>
        {modulesBalance === 0 && (
          <Link
            href="/pricing"
            className="text-xs font-medium text-ink-soft underline underline-offset-4 transition-colors hover:text-ink"
          >
            {t('buyModules')}
          </Link>
        )}
      </div>

      <RetakeModuleModal
        open={retakeOpen}
        onClose={() => setRetakeOpen(false)}
        originalSessionId={details.sessionId}
        module={details.module}
        moduleLabel={moduleLabel}
        modulesBalance={modulesBalance}
      />
    </div>
  )
}

function LesenHorenSection({
  feedback,
}: {
  feedback: LesenHorenAttemptFeedback | null
}) {
  const t = useTranslations('dashboard.testDetail.lesenHoren')
  const tDetail = useTranslations('dashboard.testDetail')

  if (!feedback || !feedback.details || !feedback.summary) {
    return (
      <div className="rounded-rad border border-line bg-card p-14 text-center">
        <p className="text-sm text-ink-soft">{t('noDetails')}</p>
      </div>
    )
  }

  const entries = Object.entries(feedback.details)
  const wrongCount =
    feedback.summary.total - feedback.summary.correct

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="rounded-rad border border-line bg-surface p-8">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {tDetail('overviewEyebrow')}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-0">
          <StatPill
            value={String(feedback.summary.correct)}
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
              value={String(feedback.summary.total)}
              label={t('total').toUpperCase()}
              soft
            />
          </div>
        </div>
        {wrongCount === 0 && (
          <div className="mt-5 font-mono text-[11px] uppercase tracking-widest text-accent-ink">
            {t('allCorrect')}
          </div>
        )}
      </div>

      {/* All answers */}
      <div className="rounded-rad border border-line bg-card p-8">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {tDetail('allAnswersEyebrow')}
        </div>
        <div className="mt-4 space-y-3">
          {entries.map(([id, detail], i) => {
            const numericId = Number(id)
            const padded = Number.isFinite(numericId)
              ? String(numericId).padStart(2, '0')
              : String(i + 1).padStart(2, '0')
            return (
              <div
                key={id}
                className={`border-l-2 py-3 pl-4 ${
                  detail.isCorrect ? 'border-accent' : 'border-muted'
                }`}
              >
                <div
                  className={`font-mono text-[10px] uppercase tracking-widest ${
                    detail.isCorrect ? 'text-accent-ink' : 'text-muted'
                  }`}
                >
                  {padded} ·{' '}
                  {detail.isCorrect ? 'RICHTIG' : 'FALSCH'}
                </div>
                <div className="mt-1 text-sm text-ink">
                  {t('yourAnswerLabel')}{' '}
                  <strong className="font-medium">
                    {detail.userAnswer || '—'}
                  </strong>
                </div>
                {!detail.isCorrect && (
                  <div className="mt-1 text-sm text-ink-soft">
                    {t('correctAnswerLabel')}{' '}
                    <strong className="font-medium">
                      {detail.correctAnswer}
                    </strong>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SchreibenSection({
  feedback,
  content,
}: {
  feedback: SchreibenFeedback | null
  content: SchreibenContent | null
}) {
  const t = useTranslations('dashboard.testDetail.schreiben')
  const tDetail = useTranslations('dashboard.testDetail')

  const criteria = feedback
    ? ([
        [t('taskFulfillment'), feedback.criteria.taskFulfillment, 25],
        [t('coherence'), feedback.criteria.coherence, 25],
        [t('vocabulary'), feedback.criteria.vocabulary, 25],
        [t('grammar'), feedback.criteria.grammar, 25],
      ] as const)
    : []

  return (
    <div className="space-y-6">
      {content?.tasks?.[0] && (
        <div className="rounded-rad border border-line bg-surface p-8">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {t('task').toUpperCase()}
          </div>
          <p className="mt-3 text-sm text-ink-soft">
            {content.tasks[0].situation}
          </p>
          <p className="mt-4 whitespace-pre-wrap text-base text-ink">
            {content.tasks[0].prompt}
          </p>
          {content.tasks[0].requiredPoints?.length > 0 && (
            <ul className="mt-4 space-y-2">
              {content.tasks[0].requiredPoints.map((p, i) => (
                <li key={i} className="flex gap-3 text-sm text-ink-soft">
                  <span aria-hidden="true">—</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {feedback ? (
        <>
          <div className="rounded-rad border border-line bg-card p-8">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {tDetail('criteriaEyebrow')}
            </div>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {criteria.map(([label, score, max]) => (
                <div key={label}>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    {label}
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-display text-4xl text-ink">
                      {score}
                    </span>
                    <span className="text-sm text-ink-soft">/ {max}</span>
                  </div>
                  <ProgressBar value={score} max={max} />
                </div>
              ))}
            </div>
          </div>

          {feedback.comment && (
            <div className="rounded-rad border border-line bg-card p-8">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {tDetail('aiFeedbackEyebrow')}
              </div>
              <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-ink">
                {feedback.comment}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-rad border border-line bg-card p-14 text-center">
          <p className="text-sm text-ink-soft">{t('noFeedback')}</p>
        </div>
      )}
    </div>
  )
}

function SprechenSection({
  feedback,
  content,
}: {
  feedback: SprechenFeedback | null
  content: SprechenContent | null
}) {
  const t = useTranslations('dashboard.testDetail.sprechen')
  const tDetail = useTranslations('dashboard.testDetail')

  const criteria = feedback
    ? ([
        [t('taskFulfillment'), feedback.criteria.taskFulfillment, 20],
        [t('fluency'), feedback.criteria.fluency, 20],
        [t('vocabulary'), feedback.criteria.vocabulary, 20],
        [t('grammar'), feedback.criteria.grammar, 20],
        [t('pronunciation'), feedback.criteria.pronunciation, 20],
      ] as const)
    : []

  return (
    <div className="space-y-6">
      {content?.tasks && content.tasks.length > 0 && (
        <div className="rounded-rad border border-line bg-surface p-8">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {t('tasks').toUpperCase()}
          </div>
          <div className="mt-4">
            {content.tasks.map((task, idx) => (
              <div
                key={task.id}
                className="border-t border-line pt-4 first:border-t-0 first:pt-0 [&:not(:first-child)]:mt-4"
              >
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  {t('teilLabel', { n: idx + 1, type: task.type })}
                </div>
                <p className="mt-2 text-base text-ink">{task.topic}</p>
                {task.points?.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {task.points.map((p, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-sm text-ink-soft"
                      >
                        <span aria-hidden="true">—</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {feedback ? (
        <>
          <div className="rounded-rad border border-line bg-card p-8">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {tDetail('criteriaEyebrow')}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3">
              {criteria.map(([label, score, max]) => (
                <div key={label}>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    {label}
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-display text-4xl text-ink">
                      {score}
                    </span>
                    <span className="text-sm text-ink-soft">/ {max}</span>
                  </div>
                  <ProgressBar value={score} max={max} />
                </div>
              ))}
            </div>
          </div>

          {feedback.comment && (
            <div className="rounded-rad border border-line bg-card p-8">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {tDetail('aiFeedbackEyebrow')}
              </div>
              <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-ink">
                {feedback.comment}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-rad border border-line bg-card p-14 text-center">
          <p className="text-sm text-ink-soft">{t('noFeedback')}</p>
        </div>
      )}
    </div>
  )
}

/**
 * Editorial stat pill — big display number on top, mono caption below.
 * Variants: default (ink), muted (if the count matters and is > 0),
 * soft (for neutral totals). Separators between pills are handled by
 * the parent with `border-l`.
 */
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
