'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { useState } from 'react'
import { RetakeModuleModal } from '@/components/exam/RetakeModuleModal'
import { ScoreHero } from '@/components/results/shared/ScoreHero'
import { ReadingListeningAnswersTable } from '@/components/results/shared/ReadingListeningAnswersTable'
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
  const tModules = useTranslations('modules')
  const [retakeOpen, setRetakeOpen] = useState(false)

  const moduleLabel = tModules(details.module)

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
        </h1>
      </header>

      {/* ====== Score card ====== */}
      <ScoreHero
        score={details.score}
        moduleLabel={moduleLabel}
        level={details.level}
        submittedAt={details.submittedAt}
      />

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

  if (!feedback || !feedback.details || !feedback.summary) {
    return (
      <div className="rounded-rad border border-line bg-card p-14 text-center">
        <p className="text-sm text-ink-soft">{t('noDetails')}</p>
      </div>
    )
  }

  return (
    <ReadingListeningAnswersTable
      details={feedback.details}
      summary={feedback.summary}
    />
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

