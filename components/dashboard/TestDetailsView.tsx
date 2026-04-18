'use client'

import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/routing'
import { useState } from 'react'
import { RetakeModuleModal } from '@/components/exam/RetakeModuleModal'
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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  const color =
    pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-brand-gold' : 'bg-brand-red'
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-surface">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
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
  const router = useRouter()
  const t = useTranslations('dashboard.testDetail')
  const tHistory = useTranslations('dashboard.history')
  const tModules = useTranslations('modules')
  const [retakeOpen, setRetakeOpen] = useState(false)

  const moduleLabel = tModules(details.module)
  const statusLabel = details.isFreeTest
    ? tHistory('status.free')
    : tHistory('status.paid')

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard/history"
          className="text-sm text-brand-muted hover:text-brand-text"
        >
          {t('backToHistory')}
        </Link>
      </div>

      <div className="rounded-2xl bg-brand-white p-8 text-center shadow-soft">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-muted">
          {t('certificateHeading', {
            level: details.level,
            module: moduleLabel,
          })}
        </p>
        <div className="mb-2 text-6xl font-bold text-brand-text">
          {details.score}
        </div>
        <p className="text-sm text-brand-muted">{t('outOf100')}</p>
        <ProgressBar value={details.score} max={100} />
        <p
          className={`mt-4 text-lg font-bold ${
            details.passed ? 'text-green-700' : 'text-brand-red'
          }`}
        >
          {details.passed ? t('passed') : t('failed')}
        </p>
        <p className="mt-4 text-xs text-brand-muted">
          {t('submittedAt', {
            date: formatDate(details.submittedAt),
            status: statusLabel,
          })}
        </p>
      </div>

      {(details.module === 'lesen' || details.module === 'horen') && (
        <LesenHorenSection
          moduleLabel={moduleLabel}
          feedback={details.feedback}
        />
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

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          href="/dashboard/history"
          className="rounded-lg border border-brand-border bg-brand-white px-6 py-2.5 text-sm font-semibold text-brand-text transition hover:bg-brand-surface"
        >
          {t('backToHistoryButton')}
        </Link>
        <button
          type="button"
          onClick={() => {
            if (modulesBalance > 0) {
              setRetakeOpen(true)
            } else {
              router.push('/pricing')
            }
          }}
          className="rounded-lg bg-brand-gold px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-gold-dark"
        >
          {t('retakeModule')}
        </button>
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
  moduleLabel,
  feedback,
}: {
  moduleLabel: string
  feedback: LesenHorenAttemptFeedback | null
}) {
  const t = useTranslations('dashboard.testDetail.lesenHoren')

  if (!feedback || !feedback.details || !feedback.summary) {
    return (
      <div className="rounded-2xl bg-brand-white p-6 text-center shadow-soft">
        <p className="text-sm text-brand-muted">{t('noDetails')}</p>
      </div>
    )
  }

  const entries = Object.entries(feedback.details)
  const wrong = entries.filter(([, d]) => !d.isCorrect)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-brand-white p-6 shadow-soft">
        <h3 className="mb-4 text-base font-semibold text-brand-text">
          {t('summary', { module: moduleLabel })}
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg bg-green-50 px-4 py-2">
            <span className="text-lg font-bold text-green-700">
              {feedback.summary.correct}
            </span>
            <span className="ml-1 text-xs text-green-600">{t('correct')}</span>
          </div>
          <div className="rounded-lg bg-red-50 px-4 py-2">
            <span className="text-lg font-bold text-brand-red">
              {feedback.summary.total - feedback.summary.correct}
            </span>
            <span className="ml-1 text-xs text-red-600">{t('wrong')}</span>
          </div>
          <div className="rounded-lg bg-brand-surface px-4 py-2">
            <span className="text-lg font-bold text-brand-text">
              {feedback.summary.total}
            </span>
            <span className="ml-1 text-xs text-brand-muted">{t('total')}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-brand-white p-6 shadow-soft">
        <h3 className="mb-4 text-base font-semibold text-brand-text">
          {t('allAnswers')}
        </h3>
        <div className="space-y-2">
          {entries.map(([id, detail]) => (
            <div
              key={id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-2.5 ${
                detail.isCorrect ? 'bg-green-50/40' : 'bg-red-50/40'
              }`}
            >
              <span className="text-xs font-medium text-brand-text">
                {t('taskLabel', { id })}
              </span>
              <div className="flex flex-wrap gap-3 text-xs">
                <span
                  className={
                    detail.isCorrect ? 'text-green-700' : 'text-red-600'
                  }
                >
                  {t('yourAnswerLabel')}{' '}
                  <strong>{detail.userAnswer || '—'}</strong>
                </span>
                {!detail.isCorrect && (
                  <span className="text-green-700">
                    {t('correctAnswerLabel')}{' '}
                    <strong>{detail.correctAnswer}</strong>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        {wrong.length === 0 && (
          <p className="mt-4 text-center text-xs text-green-700">
            {t('allCorrect')}
          </p>
        )}
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
  const criteria = feedback
    ? ([
        [t('taskFulfillment'), feedback.criteria.taskFulfillment, 25],
        [t('coherence'), feedback.criteria.coherence, 25],
        [t('vocabulary'), feedback.criteria.vocabulary, 25],
        [t('grammar'), feedback.criteria.grammar, 25],
      ] as const)
    : []

  return (
    <div className="space-y-4">
      {content?.tasks?.[0] && (
        <div className="rounded-2xl bg-brand-white p-6 shadow-soft">
          <h3 className="mb-3 text-base font-semibold text-brand-text">
            {t('task')}
          </h3>
          <p className="mb-3 text-sm font-medium text-brand-text">
            {content.tasks[0].situation}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">
            {content.tasks[0].prompt}
          </p>
          {content.tasks[0].requiredPoints?.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-brand-muted">
              {content.tasks[0].requiredPoints.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {feedback ? (
        <>
          <div className="rounded-2xl bg-brand-white p-6 shadow-soft">
            <h3 className="mb-4 text-base font-semibold text-brand-text">
              {t('criteria')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {criteria.map(([label, score, max]) => (
                <div key={label} className="rounded-lg bg-brand-bg p-4">
                  <p className="text-xs font-medium text-brand-muted">
                    {label}
                  </p>
                  <div className="mt-1 flex items-end gap-1">
                    <span className="text-2xl font-bold text-brand-text">
                      {score}
                    </span>
                    <span className="mb-0.5 text-xs text-brand-muted">
                      / {max}
                    </span>
                  </div>
                  <ProgressBar value={score} max={max} />
                </div>
              ))}
            </div>
          </div>

          {feedback.comment && (
            <div className="rounded-2xl bg-brand-white p-6 shadow-soft">
              <h4 className="mb-3 text-sm font-semibold text-brand-text">
                {t('aiFeedback')}
              </h4>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">
                {feedback.comment}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl bg-brand-white p-6 text-center shadow-soft">
          <p className="text-sm text-brand-muted">{t('noFeedback')}</p>
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
    <div className="space-y-4">
      {content?.tasks && content.tasks.length > 0 && (
        <div className="rounded-2xl bg-brand-white p-6 shadow-soft">
          <h3 className="mb-3 text-base font-semibold text-brand-text">
            {t('tasks')}
          </h3>
          <div className="space-y-3">
            {content.tasks.map((task, idx) => (
              <div key={task.id} className="rounded-lg bg-brand-bg p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">
                  {t('teilLabel', { n: idx + 1, type: task.type })}
                </p>
                <p className="mt-1 text-sm font-medium text-brand-text">
                  {task.topic}
                </p>
                {task.points?.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-brand-muted">
                    {task.points.map((p, i) => (
                      <li key={i}>{p}</li>
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
          <div className="rounded-2xl bg-brand-white p-6 shadow-soft">
            <h3 className="mb-4 text-base font-semibold text-brand-text">
              {t('criteria')}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {criteria.map(([label, score, max]) => (
                <div key={label} className="rounded-lg bg-brand-bg p-4">
                  <p className="text-xs font-medium text-brand-muted">
                    {label}
                  </p>
                  <div className="mt-1 flex items-end gap-1">
                    <span className="text-2xl font-bold text-brand-text">
                      {score}
                    </span>
                    <span className="mb-0.5 text-xs text-brand-muted">
                      / {max}
                    </span>
                  </div>
                  <ProgressBar value={score} max={max} />
                </div>
              ))}
            </div>
          </div>

          {feedback.comment && (
            <div className="rounded-2xl bg-brand-white p-6 shadow-soft">
              <h4 className="mb-3 text-sm font-semibold text-brand-text">
                {t('aiFeedback')}
              </h4>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">
                {feedback.comment}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl bg-brand-white p-6 text-center shadow-soft">
          <p className="text-sm text-brand-muted">{t('noFeedback')}</p>
        </div>
      )}
    </div>
  )
}
