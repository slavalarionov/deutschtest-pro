'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { useState } from 'react'
import { RetakeModuleModal } from '@/components/exam/RetakeModuleModal'
import { ShareSection } from '@/components/exam/ShareSection'
import { CriteriaWithLetters } from '@/components/results/CriteriaWithLetters'
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

      {/* ====== Share ====== */}
      <ShareSection
        kind="result"
        sessionId={details.sessionId}
        module={details.module}
        moduleLabel={moduleLabel}
        score={details.score}
      />

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
  const tBlock = useTranslations('results.schreiben.criteriaBlock')
  const tDetail = useTranslations('dashboard.testDetail')

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
          <CriteriaWithLetters
            title={tBlock('title')}
            translatedTitle={tBlock('translatedTitle')}
            helper={tBlock('helper')}
            criteria={[
              { key: 'taskFulfillment', score: feedback.criteria.taskFulfillment, max: 25,
                labelDe: tBlock('criteria.taskFulfillment'),
                labelTranslated: tBlock('translatedCriteria.taskFulfillment') },
              { key: 'coherence', score: feedback.criteria.coherence, max: 25,
                labelDe: tBlock('criteria.coherence'),
                labelTranslated: tBlock('translatedCriteria.coherence') },
              { key: 'vocabulary', score: feedback.criteria.vocabulary, max: 25,
                labelDe: tBlock('criteria.vocabulary'),
                labelTranslated: tBlock('translatedCriteria.vocabulary') },
              { key: 'grammar', score: feedback.criteria.grammar, max: 25,
                labelDe: tBlock('criteria.grammar'),
                labelTranslated: tBlock('translatedCriteria.grammar') },
            ]}
          />

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
  const tBlock = useTranslations('results.sprechen.criteriaBlock')
  const tDetail = useTranslations('dashboard.testDetail')

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
          <CriteriaWithLetters
            title={tBlock('title')}
            translatedTitle={tBlock('translatedTitle')}
            helper={tBlock('helper')}
            criteria={[
              { key: 'taskFulfillment', score: feedback.criteria.taskFulfillment, max: 20,
                labelDe: tBlock('criteria.taskFulfillment'),
                labelTranslated: tBlock('translatedCriteria.taskFulfillment') },
              { key: 'fluency', score: feedback.criteria.fluency, max: 20,
                labelDe: tBlock('criteria.fluency'),
                labelTranslated: tBlock('translatedCriteria.fluency') },
              { key: 'vocabulary', score: feedback.criteria.vocabulary, max: 20,
                labelDe: tBlock('criteria.vocabulary'),
                labelTranslated: tBlock('translatedCriteria.vocabulary') },
              { key: 'grammar', score: feedback.criteria.grammar, max: 20,
                labelDe: tBlock('criteria.grammar'),
                labelTranslated: tBlock('translatedCriteria.grammar') },
              { key: 'pronunciation', score: feedback.criteria.pronunciation, max: 20,
                labelDe: tBlock('criteria.pronunciation'),
                labelTranslated: tBlock('translatedCriteria.pronunciation') },
            ]}
          />

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

