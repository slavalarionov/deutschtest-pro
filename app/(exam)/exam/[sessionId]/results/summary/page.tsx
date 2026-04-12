'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { parseModuleOrder } from '@/lib/exam/module-order'
import { buildExamSummary, type ExamSummary, type ModuleSummary } from '@/lib/exam/summary'

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
  sessionFlow?: string
  completedModules?: string
  scores: Record<string, number> | null
  aiFeedback: Record<string, unknown> | null
  submittedAt: string | null
}

const MODULE_LABELS: Record<string, string> = {
  lesen: 'Lesen',
  horen: 'Hören',
  schreiben: 'Schreiben',
  sprechen: 'Sprechen',
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  const color = pct >= 75 ? 'bg-green-500' : pct >= 60 ? 'bg-brand-gold' : 'bg-brand-red'
  return (
    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-brand-surface">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function ScoreBar({ module, score }: { module: string; score: number }) {
  const pct = Math.min(100, Math.max(0, score))
  const color = pct >= 75 ? 'bg-green-500' : pct >= 60 ? 'bg-brand-gold' : 'bg-brand-red'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex h-40 w-full items-end justify-center rounded-lg bg-brand-surface p-1">
        <div
          className={`w-full rounded-md transition-all duration-700 ${color}`}
          style={{ height: `${pct}%` }}
        />
        <span className="absolute inset-x-0 top-2 text-center text-xl font-bold text-brand-text">
          {score}
        </span>
      </div>
      <span className="text-xs font-semibold text-brand-muted">{MODULE_LABELS[module] || module}</span>
    </div>
  )
}

export default function SummaryPage() {
  const params = useParams<{ sessionId: string }>()
  const router = useRouter()
  const [data, setData] = useState<ResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/exam/results?sessionId=${params.sessionId}`)
        const json = await res.json()
        if (json.success) {
          setData(json)
        } else {
          setError(json.error || 'Ergebnisse konnten nicht geladen werden.')
        }
      } catch {
        setError('Netzwerkfehler beim Laden der Ergebnisse.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.sessionId])

  const sessionModulesOrder = useMemo(
    () => (data ? parseModuleOrder(data.mode ?? '', data.sessionFlow ?? '') : []),
    [data],
  )

  const completedSet = useMemo(
    () => new Set((data?.completedModules ?? '').split(',').map(s => s.trim()).filter(Boolean)),
    [data],
  )

  const isSessionComplete = sessionModulesOrder.length > 0
    && sessionModulesOrder.every(m => completedSet.has(m))

  useEffect(() => {
    if (!data || loading) return
    if (!isSessionComplete || sessionModulesOrder.length < 2) {
      router.replace(`/exam/${params.sessionId}/results`)
    }
  }, [data, loading, isSessionComplete, sessionModulesOrder.length, router, params.sessionId])

  const summary: ExamSummary | null = useMemo(() => {
    if (!data?.scores || !isSessionComplete) return null
    return buildExamSummary(data.scores, sessionModulesOrder)
  }, [data, isSessionComplete, sessionModulesOrder])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-gold border-t-transparent" />
          <p className="text-sm text-brand-muted">Gesamtauswertung wird geladen…</p>
        </div>
      </div>
    )
  }

  if (error || !data || !summary) {
    if (!isSessionComplete && data) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-brand-bg">
          <p className="text-sm text-brand-muted">Weiterleitung…</p>
        </div>
      )
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
        <div className="max-w-md rounded-xl bg-brand-white p-8 text-center shadow-soft">
          <p className="mb-4 text-lg font-semibold text-brand-text">Keine Ergebnisse gefunden</p>
          <p className="mb-6 text-sm text-brand-muted">{error || 'Gesamtauswertung nicht verfügbar.'}</p>
          <button
            onClick={() => router.push('/')}
            className="rounded-lg bg-brand-gold px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-gold-dark"
          >
            Zur Startseite
          </button>
        </div>
      </div>
    )
  }

  const { level, aiFeedback } = data

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Header banner */}
        <div className="mb-10 rounded-2xl bg-brand-white p-8 text-center shadow-soft sm:p-10">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand-muted">
            Goethe-Zertifikat {level}
          </p>
          <h1 className="mb-4 text-2xl font-bold text-brand-text sm:text-3xl">Gesamtauswertung</h1>

          <div
            className={`mx-auto mb-4 inline-flex h-28 w-28 items-center justify-center rounded-full ${
              summary.passed ? 'bg-green-50' : 'bg-red-50'
            }`}
          >
            <span className={`text-5xl font-bold ${summary.passed ? 'text-green-700' : 'text-brand-red'}`}>
              {summary.totalAverage}
            </span>
          </div>

          <p className={`mb-2 text-xl font-bold ${summary.passed ? 'text-green-700' : 'text-brand-red'}`}>
            {summary.passed ? 'Bestanden' : 'Nicht bestanden'}
          </p>
          <p className="text-sm text-brand-muted">
            {summary.modulesPassed}/{summary.modulesTotal} Module bestanden (Grenze: 60/100 pro Modul)
          </p>

          {data.submittedAt && (
            <p className="mt-4 text-xs text-brand-muted">
              Abgegeben am{' '}
              {new Date(data.submittedAt).toLocaleString('de-DE', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          )}
        </div>

        {/* Module score bars */}
        <div className="mb-10 rounded-xl border border-brand-border bg-brand-white p-6 shadow-soft">
          <h2 className="mb-6 text-center text-lg font-semibold text-brand-text">
            Ergebnisse nach Modul
          </h2>
          <div className={`grid gap-4 ${summary.modules.length <= 2 ? 'grid-cols-2' : 'grid-cols-4'}`}>
            {summary.modules.map((m) => (
              <ScoreBar key={m.module} module={m.module} score={m.score} />
            ))}
          </div>
        </div>

        {/* Strengths */}
        {summary.strengths.length > 0 && (
          <div className="mb-8 rounded-xl border border-green-200 bg-green-50/60 p-6">
            <h2 className="mb-3 text-base font-semibold text-green-800">🟢 Stärken</h2>
            <ul className="space-y-1.5">
              {summary.strengths.map((m) => (
                <li key={m.module} className="text-sm text-green-700">
                  {MODULE_LABELS[m.module]}: <strong>{m.score}/100</strong>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {summary.weaknesses.length > 0 && (
          <div className="mb-8 rounded-xl border border-red-200 bg-red-50/60 p-6">
            <h2 className="mb-3 text-base font-semibold text-red-800">🔴 Schwächen</h2>
            <ul className="space-y-1.5">
              {summary.weaknesses.map((m) => (
                <li key={m.module} className="text-sm text-red-700">
                  {MODULE_LABELS[m.module]}: <strong>{m.score}/100</strong>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {summary.recommendations.length > 0 && (
          <div className="mb-10 rounded-xl border border-brand-border bg-brand-white p-6 shadow-soft">
            <h2 className="mb-4 text-base font-semibold text-brand-text">
              📋 Empfehlungen für die nächste Phase
            </h2>
            <ul className="space-y-3">
              {summary.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-brand-muted">
                  <span className="mt-0.5 shrink-0 text-brand-gold">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Detailed feedback per module (collapsible) */}
        <div className="mb-10">
          <h2 className="mb-4 text-base font-semibold text-brand-text">
            📄 Detaillierte Ergebnisse pro Modul
          </h2>
          <div className="space-y-4">
            {summary.modules.map((m) => (
              <ModuleDetailCollapsible
                key={m.module}
                moduleSummary={m}
                aiFeedback={aiFeedback}
              />
            ))}
          </div>
        </div>

        {/* Bottom buttons */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="rounded-lg bg-brand-gold px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-gold-dark"
          >
            Zur Modulauswahl
          </button>
          <button
            type="button"
            onClick={() => alert('Bald verfügbar')}
            className="text-sm text-brand-muted underline underline-offset-2 hover:text-brand-text"
          >
            Bericht per E-Mail senden
          </button>
          <button
            type="button"
            onClick={() => alert('Bald verfügbar')}
            className="text-sm text-brand-muted underline underline-offset-2 hover:text-brand-text"
          >
            Als PDF herunterladen
          </button>
        </div>
      </div>
    </div>
  )
}

function ModuleDetailCollapsible({
  moduleSummary,
  aiFeedback,
}: {
  moduleSummary: ModuleSummary
  aiFeedback: Record<string, unknown> | null
}) {
  const [open, setOpen] = useState(false)
  const { module, score, passed } = moduleSummary
  const fb = aiFeedback ? aiFeedback[module] : null

  return (
    <div className="rounded-xl border border-brand-border bg-brand-white shadow-soft">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{passed ? '✅' : '❌'}</span>
          <span className="text-sm font-semibold text-brand-text">
            {MODULE_LABELS[module]}
          </span>
          <span className="text-sm text-brand-muted">{score}/100</span>
        </div>
        <svg
          className={`h-4 w-4 text-brand-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && fb != null && (
        <div className="border-t border-brand-border px-5 pb-5 pt-4">
          {(module === 'lesen' || module === 'horen') && (
            <LesenHorenInline module={module} feedback={fb as LesenHorenFeedback} />
          )}
          {module === 'schreiben' && <SchreibenInline feedback={fb as SchreibenFeedback} />}
          {module === 'sprechen' && <SprechenInline feedback={fb as SprechenFeedback} />}
        </div>
      )}

      {open && !fb && (
        <div className="border-t border-brand-border px-5 pb-5 pt-4">
          <p className="text-sm text-brand-muted">Kein detailliertes Feedback verfügbar.</p>
        </div>
      )}
    </div>
  )
}

function LesenHorenInline({ module, feedback }: { module: string; feedback: LesenHorenFeedback }) {
  if (!feedback.details || !feedback.summary) return null
  const wrongAnswers = Object.entries(feedback.details).filter(([, d]) => !d.isCorrect)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-green-50 px-3 py-1.5">
          <span className="text-sm font-bold text-green-700">{feedback.summary.correct}</span>
          <span className="ml-1 text-xs text-green-600">richtig</span>
        </div>
        <div className="rounded-lg bg-red-50 px-3 py-1.5">
          <span className="text-sm font-bold text-brand-red">
            {feedback.summary.total - feedback.summary.correct}
          </span>
          <span className="ml-1 text-xs text-red-600">falsch</span>
        </div>
      </div>
      {wrongAnswers.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Falsche Antworten</p>
          {wrongAnswers.map(([id, detail]) => (
            <div key={id} className="flex items-center justify-between rounded-lg bg-red-50/50 px-3 py-2 text-xs">
              <span className="font-medium text-brand-text">Aufgabe {id}</span>
              <div className="flex gap-3">
                <span className="text-red-600">
                  Ihre: <strong>{detail.userAnswer || '—'}</strong>
                </span>
                <span className="text-green-600">
                  Richtig: <strong>{detail.correctAnswer}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SchreibenInline({ feedback }: { feedback: SchreibenFeedback }) {
  const criteria = [
    ['Aufgabenerfüllung', feedback.criteria.taskFulfillment, 25],
    ['Kohärenz', feedback.criteria.coherence, 25],
    ['Wortschatz', feedback.criteria.vocabulary, 25],
    ['Grammatik', feedback.criteria.grammar, 25],
  ] as const

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {criteria.map(([label, score, max]) => (
          <div key={label} className="rounded-lg bg-brand-bg p-3">
            <p className="text-xs font-medium text-brand-muted">{label}</p>
            <div className="mt-1 flex items-end gap-1">
              <span className="text-lg font-bold text-brand-text">{score}</span>
              <span className="mb-0.5 text-xs text-brand-muted">/ {max}</span>
            </div>
            <ProgressBar value={score} max={max} />
          </div>
        ))}
      </div>
      {feedback.comment && (
        <div>
          <p className="mb-1 text-xs font-semibold text-brand-muted">KI-Feedback</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">{feedback.comment}</p>
        </div>
      )}
    </div>
  )
}

function SprechenInline({ feedback }: { feedback: SprechenFeedback }) {
  const criteria = [
    ['Aufgabenerfüllung', feedback.criteria.taskFulfillment, 20],
    ['Flüssigkeit', feedback.criteria.fluency, 20],
    ['Wortschatz', feedback.criteria.vocabulary, 20],
    ['Grammatik', feedback.criteria.grammar, 20],
    ['Aussprache', feedback.criteria.pronunciation, 20],
  ] as const

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {criteria.map(([label, score, max]) => (
          <div key={label} className="rounded-lg bg-brand-bg p-3">
            <p className="text-xs font-medium text-brand-muted">{label}</p>
            <div className="mt-1 flex items-end gap-1">
              <span className="text-lg font-bold text-brand-text">{score}</span>
              <span className="mb-0.5 text-xs text-brand-muted">/ {max}</span>
            </div>
            <ProgressBar value={score} max={max} />
          </div>
        ))}
      </div>
      {feedback.comment && (
        <div>
          <p className="mb-1 text-xs font-semibold text-brand-muted">KI-Feedback</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">{feedback.comment}</p>
        </div>
      )}
    </div>
  )
}
