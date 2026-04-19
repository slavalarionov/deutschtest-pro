'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { RetakeModuleModal } from '@/components/exam/RetakeModuleModal'

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

interface LesenHorenFeedback {
  details: Record<string, { userAnswer: string; correctAnswer: string; isCorrect: boolean }>
  summary: { correct: number; total: number; score: number }
}

interface ResultsData {
  level: string
  mode: string
  scores: ModuleScores | null
  aiFeedback: Record<string, unknown> | null
  submittedAt: string | null
  modulesBalance: number
}

const VALID_MODULES = new Set(['lesen', 'horen', 'schreiben', 'sprechen'])

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  const color = pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-brand-gold' : 'bg-brand-red'
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-surface">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function ResultsPage() {
  const params = useParams<{ sessionId: string }>()
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('results')
  const tModules = useTranslations('modules')
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
      <div className="flex min-h-screen items-center justify-center bg-brand-bg">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-gold border-t-transparent" />
          <p className="text-sm text-brand-muted">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
        <div className="max-w-md rounded-xl bg-brand-white p-8 text-center shadow-soft">
          <p className="mb-4 text-lg font-semibold text-brand-text">{t('notFound')}</p>
          <p className="mb-6 text-sm text-brand-muted">{error || t('notSubmitted')}</p>
          <button
            onClick={() => router.push('/')}
            className="rounded-lg bg-brand-gold px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-gold-dark"
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
  const passed = score !== undefined && score >= 60

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 rounded-2xl bg-brand-white p-8 text-center shadow-soft">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-muted">
            {t('certificateHeading', { level, module: moduleLabel })}
          </p>
          <div
            data-testid="result-score-value"
            className="mb-2 text-7xl font-bold text-brand-text"
          >
            {score ?? '—'}
          </div>
          <p className="text-sm text-brand-muted">{t('outOf100')}</p>
          {score !== undefined && <ProgressBar value={score} max={100} />}
          {score !== undefined && (
            <p
              data-testid="result-status"
              data-passed={passed ? 'true' : 'false'}
              className={`mt-4 text-lg font-bold ${passed ? 'text-green-700' : 'text-brand-red'}`}
            >
              {passed ? t('passed') : t('failed')}
            </p>
          )}
          {data.submittedAt && (
            <p className="mt-4 text-xs text-brand-muted">
              {t('submittedAt', {
                date: new Date(data.submittedAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }),
              })}
            </p>
          )}
        </div>

        {/* Detailed feedback */}
        {aiFeedback && (() => {
          const fb = (aiFeedback as Record<string, unknown>)[activeModule]
          if (!fb) return null
          if (activeModule === 'lesen' || activeModule === 'horen') {
            return <LesenHorenDetails moduleLabel={moduleLabel} feedback={fb as LesenHorenFeedback} />
          }
          if (activeModule === 'schreiben') {
            return <SchreibenDetails feedback={fb as SchreibenFeedback} />
          }
          if (activeModule === 'sprechen') {
            return <SprechenDetails feedback={fb as SprechenFeedback} />
          }
          return null
        })()}

        {/* Navigation buttons */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="rounded-lg bg-brand-gold px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-gold-dark"
            >
              {t('toDashboard')}
            </button>
            <button
              type="button"
              onClick={() => {
                if (data.modulesBalance > 0) {
                  setRetakeModalOpen(true)
                } else {
                  router.push('/pricing')
                }
              }}
              className="rounded-lg border border-brand-border bg-brand-white px-6 py-2.5 text-sm font-semibold text-brand-text transition hover:bg-brand-surface"
            >
              {t('retakeModule')}
            </button>
          </div>
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

function LesenHorenDetails({ moduleLabel, feedback }: { moduleLabel: string; feedback: LesenHorenFeedback }) {
  const t = useTranslations('results.lesenHoren')
  if (!feedback.details || !feedback.summary) return null

  const wrongAnswers = Object.entries(feedback.details).filter(([, d]) => !d.isCorrect)

  return (
    <div className="mb-6 rounded-xl bg-brand-white p-6 shadow-soft">
      <h3 className="mb-4 text-base font-semibold text-brand-text">
        {t('title', { module: moduleLabel })}
      </h3>
      <div className="mb-4 flex items-center gap-4">
        <div className="rounded-lg bg-green-50 px-4 py-2">
          <span className="text-lg font-bold text-green-700">{feedback.summary.correct}</span>
          <span className="ml-1 text-xs text-green-600">{t('correct')}</span>
        </div>
        <div className="rounded-lg bg-red-50 px-4 py-2">
          <span className="text-lg font-bold text-brand-red">{feedback.summary.total - feedback.summary.correct}</span>
          <span className="ml-1 text-xs text-red-600">{t('wrong')}</span>
        </div>
        <div className="rounded-lg bg-brand-surface px-4 py-2">
          <span className="text-lg font-bold text-brand-text">{feedback.summary.total}</span>
          <span className="ml-1 text-xs text-brand-muted">{t('total')}</span>
        </div>
      </div>

      {wrongAnswers.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">{t('wrongAnswers')}</p>
          <div className="space-y-2">
            {wrongAnswers.map(([id, detail]) => (
              <div key={id} className="flex items-center justify-between rounded-lg bg-red-50/50 px-4 py-2.5">
                <span className="text-xs font-medium text-brand-text">{t('taskLabel', { id })}</span>
                <div className="flex gap-3 text-xs">
                  <span className="text-red-600">{t('yourAnswerLabel')} <strong>{detail.userAnswer || '—'}</strong></span>
                  <span className="text-green-600">{t('correctAnswerLabel')} <strong>{detail.correctAnswer}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SchreibenDetails({ feedback }: { feedback: SchreibenFeedback }) {
  const t = useTranslations('results.schreiben')
  const criteria = [
    ['taskFulfillment', feedback.criteria.taskFulfillment, 25],
    ['coherence', feedback.criteria.coherence, 25],
    ['vocabulary', feedback.criteria.vocabulary, 25],
    ['grammar', feedback.criteria.grammar, 25],
  ] as const

  return (
    <div className="mb-6 space-y-4">
      <div className="rounded-xl bg-brand-white p-6 shadow-soft">
        <h3 className="mb-4 text-base font-semibold text-brand-text">{t('title')}</h3>
        <div className="grid grid-cols-2 gap-3">
          {criteria.map(([key, score, max]) => (
            <div key={key} className="rounded-lg bg-brand-bg p-4">
              <p className="text-xs font-medium text-brand-muted">{t(key)}</p>
              <div className="mt-1 flex items-end gap-1">
                <span className="text-2xl font-bold text-brand-text">{score}</span>
                <span className="mb-0.5 text-xs text-brand-muted">/ {max}</span>
              </div>
              <ProgressBar value={score} max={max} />
            </div>
          ))}
        </div>
      </div>
      {feedback.comment && (
        <div className="rounded-xl bg-brand-white p-6 shadow-soft">
          <h4 className="mb-3 text-sm font-semibold text-brand-text">{t('aiFeedback')}</h4>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">{feedback.comment}</p>
        </div>
      )}
    </div>
  )
}

function SprechenDetails({ feedback }: { feedback: SprechenFeedback }) {
  const t = useTranslations('results.sprechen')
  const criteria = [
    ['taskFulfillment', feedback.criteria.taskFulfillment, 20],
    ['fluency', feedback.criteria.fluency, 20],
    ['vocabulary', feedback.criteria.vocabulary, 20],
    ['grammar', feedback.criteria.grammar, 20],
    ['pronunciation', feedback.criteria.pronunciation, 20],
  ] as const

  return (
    <div className="mb-6 space-y-4">
      <div className="rounded-xl bg-brand-white p-6 shadow-soft">
        <h3 className="mb-4 text-base font-semibold text-brand-text">{t('title')}</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {criteria.map(([key, score, max]) => (
            <div key={key} className="rounded-lg bg-brand-bg p-4">
              <p className="text-xs font-medium text-brand-muted">{t(key)}</p>
              <div className="mt-1 flex items-end gap-1">
                <span className="text-2xl font-bold text-brand-text">{score}</span>
                <span className="mb-0.5 text-xs text-brand-muted">/ {max}</span>
              </div>
              <ProgressBar value={score} max={max} />
            </div>
          ))}
        </div>
      </div>
      {feedback.comment && (
        <div className="rounded-xl bg-brand-white p-6 shadow-soft">
          <h4 className="mb-3 text-sm font-semibold text-brand-text">{t('aiFeedback')}</h4>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">{feedback.comment}</p>
        </div>
      )}
    </div>
  )
}
