'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/routing'
import { RetakeModuleModal } from '@/components/exam/RetakeModuleModal'
import { ShareSection } from '@/components/exam/ShareSection'
import { CriteriaWithLetters } from '@/components/results/CriteriaWithLetters'
import { ScoreHero } from '@/components/results/shared/ScoreHero'
import { ReadingListeningAnswersTable } from '@/components/results/shared/ReadingListeningAnswersTable'
import { userInputSchema, type UserInput } from '@/types/exam'

interface ModuleScores {
  lesen?: number
  horen?: number
  schreiben?: number
  sprechen?: number
}

interface SchreibenFeedback {
  score: number
  criteria: { taskFulfillment: number; coherence: number; vocabulary: number; grammar: number }
  comment: string
}

interface SprechenFeedback {
  score: number
  criteria: { taskFulfillment: number; fluency: number; vocabulary: number; grammar: number; pronunciation: number }
  comment: string
}

interface ResultsData {
  level: string
  mode: string
  scores: ModuleScores | null
  aiFeedback: Record<string, unknown> | null
  userInput: unknown | null
  submittedAt: string | null
  modulesBalance: number
  attemptId: string | null
  hasFeedback: boolean
}

const VALID_MODULES = new Set(['lesen', 'horen', 'schreiben', 'sprechen'])

export default function ResultsPage() {
  const params = useParams<{ sessionId: string }>()
  const router = useRouter()
  const t = useTranslations('results')
  const tModules = useTranslations('modules')
  const tDetail = useTranslations('dashboard.testDetail')
  const [data, setData] = useState<ResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retakeModalOpen, setRetakeModalOpen] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/exam/results?sessionId=${params.sessionId}`)
        const json = await res.json()
        if (json.success) {
          setData(json)
        } else {
          setError(json.error || t('errors.loadFailed'))
        }
      } catch {
        setError(t('errors.network'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.sessionId, t])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-ink border-t-transparent" />
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            {t('loading')}
          </p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-4">
        <div className="w-full max-w-md rounded-rad border border-line bg-card p-10 text-center">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {t('notFound')}
          </div>
          <h1 className="mt-4 font-display text-4xl leading-[1.05] tracking-[-0.03em] text-ink">
            {error || t('notSubmitted')}
          </h1>
          <button
            onClick={() => router.push('/')}
            className="mt-8 rounded-rad-pill bg-ink px-8 py-3 text-sm font-medium text-page transition-colors hover:bg-ink/90"
          >
            {t('toHome')}
          </button>
        </div>
      </div>
    )
  }

  const { scores, aiFeedback, level, mode } = data
  const activeModule = VALID_MODULES.has(mode) ? mode : 'lesen'
  const moduleLabel = tModules(activeModule as 'lesen' | 'horen' | 'schreiben' | 'sprechen')
  const score = scores ? (scores as Record<string, number>)[activeModule] : undefined

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
        {/* ====== Editorial header ====== */}
        <header className="space-y-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {tDetail('eyebrow', { level })}
          </div>
          <h1 className="font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
            {moduleLabel}.
          </h1>
        </header>

        {/* ====== Hero score card ====== */}
        <ScoreHero
          score={score}
          moduleLabel={moduleLabel}
          level={level}
          submittedAt={data.submittedAt}
        />

        {/* ====== User input (Schreiben text / Sprechen transcript) ====== */}
        {(activeModule === 'schreiben' || activeModule === 'sprechen') && (
          <UserInputBlock module={activeModule} raw={data.userInput} />
        )}

        {/* ====== Detailed feedback ====== */}
        {aiFeedback && (() => {
          const fb = (aiFeedback as Record<string, unknown>)[activeModule]
          if (!fb) return null
          if (activeModule === 'lesen' || activeModule === 'horen') {
            const lhFb = fb as { details: Record<string, { userAnswer: string; correctAnswer: string; isCorrect: boolean }>; summary: { correct: number; total: number; score: number } }
            if (!lhFb.details || !lhFb.summary) return null
            return (
              <ReadingListeningAnswersTable
                details={lhFb.details}
                summary={lhFb.summary}
                hideAllCorrectBadge
              />
            )
          }
          if (activeModule === 'schreiben') {
            return <SchreibenDetails feedback={fb as SchreibenFeedback} />
          }
          if (activeModule === 'sprechen') {
            return <SprechenDetails feedback={fb as SprechenFeedback} />
          }
          return null
        })()}

        {/* ====== Share ====== */}
        {data.submittedAt && (
          <ShareSection
            kind="result"
            sessionId={params.sessionId}
            module={activeModule as 'lesen' | 'horen' | 'schreiben' | 'sprechen'}
            moduleLabel={moduleLabel}
            score={score}
          />
        )}

        {/* ====== Feedback form ====== */}
        {data.submittedAt && data.attemptId && (
          <FeedbackSection
            attemptId={data.attemptId}
            initiallySubmitted={data.hasFeedback}
          />
        )}

        {/* ====== Footer actions ====== */}
        <div className="flex flex-col items-center gap-3 pt-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="rounded-rad-pill bg-ink px-8 py-3 text-sm font-medium text-page transition-colors hover:bg-ink/90"
            >
              {t('toDashboard')}
            </button>
            <button
              type="button"
              disabled={data.modulesBalance === 0}
              aria-label={
                data.modulesBalance === 0 ? tDetail('retakeDisabled') : undefined
              }
              title={
                data.modulesBalance === 0 ? tDetail('retakeDisabled') : undefined
              }
              onClick={() => {
                if (data.modulesBalance > 0) setRetakeModalOpen(true)
              }}
              className={`rounded-rad-pill px-8 py-3 text-sm font-medium transition-colors ${
                data.modulesBalance > 0
                  ? 'border border-line bg-card text-ink hover:bg-surface'
                  : 'cursor-not-allowed border border-line bg-line text-muted'
              }`}
            >
              {t('retakeModule')}
            </button>
          </div>
          {data.modulesBalance === 0 && (
            <Link
              href="/pricing"
              className="text-xs font-medium text-ink-soft underline underline-offset-4 transition-colors hover:text-ink"
            >
              {tDetail('buyModules')}
            </Link>
          )}
        </div>
      </div>

      <RetakeModuleModal
        open={retakeModalOpen}
        onClose={() => setRetakeModalOpen(false)}
        originalSessionId={params.sessionId}
        module={activeModule as 'lesen' | 'horen' | 'schreiben' | 'sprechen'}
        moduleLabel={moduleLabel}
        modulesBalance={data?.modulesBalance ?? 0}
      />
    </div>
  )
}

function SchreibenDetails({ feedback }: { feedback: SchreibenFeedback }) {
  const tBlock = useTranslations('results.schreiben.criteriaBlock')
  const tDetail = useTranslations('dashboard.testDetail')

  return (
    <div className="space-y-6">
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
    </div>
  )
}

function SprechenDetails({ feedback }: { feedback: SprechenFeedback }) {
  const tBlock = useTranslations('results.sprechen.criteriaBlock')
  const tDetail = useTranslations('dashboard.testDetail')

  return (
    <div className="space-y-6">
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
    </div>
  )
}

function FeedbackSection({
  attemptId,
  initiallySubmitted,
}: {
  attemptId: string
  initiallySubmitted: boolean
}) {
  const t = useTranslations('results.feedback')
  const [submitted, setSubmitted] = useState(initiallySubmitted)
  const [rating, setRating] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const trimmed = message.trim()
  const canSubmit = rating !== null || trimmed.length > 0
  const remaining = 500 - message.length

  if (submitted) {
    return (
      <div className="rounded-rad border border-line bg-accent-soft p-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-accent-ink">
          {t('successEyebrow')}
        </div>
        <p className="mt-3 text-base text-ink">{t('success')}</p>
      </div>
    )
  }

  async function submit() {
    if (!canSubmit || saving) return
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attempt_id: attemptId,
          rating: rating ?? undefined,
          message: trimmed.length > 0 ? trimmed : undefined,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as { code?: string }
      if (!res.ok) {
        if (json.code === 'already_submitted') {
          setSubmitted(true)
          return
        }
        if (json.code === 'validation_required') {
          setError(t('validationRequired'))
          return
        }
        setError(t('errorNetwork'))
        return
      }
      setSubmitted(true)
    } catch {
      setError(t('errorNetwork'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {t('eyebrow')}
        </div>
        <h2 className="mt-3 font-display text-3xl leading-[1.1] tracking-[-0.02em] text-ink sm:text-4xl">
          {t('title')}
        </h2>
        <p className="mt-3 text-sm text-muted">{t('description')}</p>
      </div>

      <div className="rounded-rad border border-line bg-card p-6 sm:p-8">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {t('ratingLabel')}
        </div>
        <div className="mt-3 flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = rating === n
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRating(rating === n ? null : n)}
                aria-label={String(n)}
                aria-pressed={active}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full font-mono text-base tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                  active
                    ? 'bg-ink text-card'
                    : 'text-ink hover:bg-surface'
                }`}
              >
                {n}
              </button>
            )
          })}
        </div>

        <div className="mt-6">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 500))}
            placeholder={t('messagePlaceholder')}
            rows={4}
            className="w-full resize-none rounded-rad-sm border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-muted transition-colors focus:border-ink focus:outline-none"
          />
          <div className="mt-1 flex justify-end font-mono text-xs tabular-nums text-muted">
            {remaining}
          </div>
        </div>

        {error && <div className="mt-4 text-sm text-error">{error}</div>}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || saving}
            className="rounded-rad-pill bg-ink px-6 py-2.5 text-sm font-medium text-page transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? t('submitting') : t('submit')}
          </button>
        </div>
      </div>
    </section>
  )
}

/**
 * "Your answer" block. Renders the user-submitted Schreiben text or the
 * Sprechen transcript above the AI feedback so the user can re-read what
 * they wrote/said before reading the critique. Old attempts (before
 * migration 025) have raw === null and we render an explanatory empty
 * state instead.
 */
function UserInputBlock({
  module,
  raw,
}: {
  module: 'schreiben' | 'sprechen'
  raw: unknown
}) {
  const t = useTranslations('results.userInput')
  const parsed: UserInput = (() => {
    const result = userInputSchema.safeParse(raw)
    return result.success ? result.data : {}
  })()

  const payload = module === 'schreiben' ? parsed.schreiben : parsed.sprechen
  const hasContent = payload && (
    module === 'schreiben'
      ? Boolean((payload as { text?: string }).text?.trim())
      : Boolean((payload as { transcript?: string }).transcript?.trim())
  )

  const eyebrow = module === 'schreiben' ? t('schreibenLabel') : t('sprechenLabel')

  return (
    <section
      data-testid={`result-user-input-${module}`}
      className="rounded-rad border border-line bg-card p-6 sm:p-8"
    >
      <div className="flex items-baseline justify-between gap-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {eyebrow}
        </div>
        {hasContent && module === 'schreiben' && (
          <div className="font-mono text-xs tabular-nums text-muted">
            {t('wordCount', {
              count: (payload as { wordCount?: number; text: string }).wordCount
                ?? (payload as { text: string }).text.trim().split(/\s+/).length,
            })}
          </div>
        )}
      </div>

      {hasContent ? (
        <div className="mt-4 border-l-2 border-line pl-4">
          <p className="whitespace-pre-wrap text-base leading-relaxed text-ink">
            {module === 'schreiben'
              ? (payload as { text: string }).text
              : (payload as { transcript: string }).transcript}
          </p>
        </div>
      ) : (
        <div className="mt-4 border-l-2 border-line pl-4">
          <p className="text-base leading-relaxed text-ink-soft">
            {t('notSavedLabel')}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {t('notSavedExplanation')}
          </p>
        </div>
      )}
    </section>
  )
}

