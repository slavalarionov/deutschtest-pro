'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { parseModuleOrder } from '@/lib/exam/module-order'
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
  sessionFlow?: string
  completedModules?: string
  currentModule?: string | null
  scores: ModuleScores | null
  aiFeedback: Record<string, unknown> | null
  submittedAt: string | null
  modulesBalance: number
}

const MODULE_LABELS: Record<string, string> = {
  lesen: 'Lesen',
  horen: 'Hören',
  schreiben: 'Schreiben',
  sprechen: 'Sprechen',
}

function buildOverallRecommendations(
  aiFeedback: Record<string, unknown> | null,
  modules: string[]
): string {
  if (!aiFeedback) {
    return 'Üben Sie regelmäßig alle Prüfungsteile und nutzen Sie das Detail-Feedback zu Ihren Aufgaben.'
  }
  const chunks: string[] = []
  for (const m of modules) {
    const fb = aiFeedback[m]
    if (!fb || typeof fb !== 'object') continue
    if (m === 'lesen' || m === 'horen') {
      const summary = (fb as LesenHorenFeedback).summary
      if (summary) {
        chunks.push(
          `${MODULE_LABELS[m] || m}: ${summary.correct}/${summary.total} richtig — wiederholen Sie die markierten Fehler gezielt.`
        )
      }
    }
    if (m === 'schreiben' || m === 'sprechen') {
      const c = (fb as SchreibenFeedback | SprechenFeedback).comment
      if (c) chunks.push(`${MODULE_LABELS[m] || m}: ${c}`)
    }
  }
  if (chunks.length === 0) {
    return 'Üben Sie regelmäßig alle Prüfungsteile und nutzen Sie das Detail-Feedback zu Ihren Aufgaben.'
  }
  return chunks.join('\n\n')
}

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
  const searchParams = useSearchParams()
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

  const remainingInSession = sessionModulesOrder.filter(m => !completedSet.has(m))

  useEffect(() => {
    if (!data || loading) return
    if (isSessionComplete && sessionModulesOrder.length >= 2) {
      router.replace(`/exam/${params.sessionId}/results/summary`)
    }
  }, [data, loading, isSessionComplete, sessionModulesOrder.length, router, params.sessionId])

  const shownModule = useMemo(() => {
    const justParam = searchParams.get('just')
    if (justParam && sessionModulesOrder.includes(justParam)) return justParam
    if (!data?.scores) return sessionModulesOrder[0] ?? null
    const lastCompleted = [...completedSet].filter(m => sessionModulesOrder.includes(m)).pop()
    return lastCompleted ?? sessionModulesOrder[0] ?? null
  }, [searchParams, sessionModulesOrder, data, completedSet])

  const currentModuleScore = shownModule && data?.scores
    ? (data.scores as Record<string, number>)[shownModule]
    : undefined

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-gold border-t-transparent" />
          <p className="text-sm text-brand-muted">Ergebnisse werden geladen…</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
        <div className="max-w-md rounded-xl bg-brand-white p-8 text-center shadow-soft">
          <p className="mb-4 text-lg font-semibold text-brand-text">Keine Ergebnisse gefunden</p>
          <p className="mb-6 text-sm text-brand-muted">{error || 'Die Prüfung wurde noch nicht abgegeben.'}</p>
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

  if (isSessionComplete && sessionModulesOrder.length >= 2) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg">
        <p className="text-sm text-brand-muted">Weiterleitung zur Gesamtauswertung…</p>
      </div>
    )
  }

  const { scores, aiFeedback, level } = data
  const activeModules = sessionModulesOrder

  const totalScore = scores
    ? activeModules.reduce((sum, m) => sum + ((scores as Record<string, number>)[m] || 0), 0)
    : 0
  const averageScore = activeModules.length > 0 ? Math.round(totalScore / activeModules.length) : 0
  const showPerModulePass = activeModules.length > 1
  const overallText =
    activeModules.length > 1 ? buildOverallRecommendations(aiFeedback, activeModules) : ''

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 rounded-2xl bg-brand-white p-8 text-center shadow-soft">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-muted">
            Goethe-Zertifikat {level} — Ergebnisse
          </p>
          <div className="mb-2 text-7xl font-bold text-brand-text">{averageScore}</div>
          <p className="text-sm text-brand-muted">
            {activeModules.length > 1
              ? `Durchschnitt über ${activeModules.length} gewählte Module (von 100)`
              : 'von 100 Punkten'}
          </p>
          <ProgressBar value={averageScore} max={100} />
          {data.submittedAt && (
            <p className="mt-4 text-xs text-brand-muted">
              Abgegeben am {new Date(data.submittedAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          )}
        </div>

        {/* Module scores */}
        <div className={`mb-6 grid gap-4 ${activeModules.length > 1 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1'}`}>
          {activeModules.map((mod) => {
            const score = scores ? (scores as Record<string, number>)[mod] : undefined
            return (
              <div key={mod} className="rounded-xl bg-brand-white p-5 shadow-soft">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-muted">
                  {MODULE_LABELS[mod] || mod}
                </p>
                <p className="flex items-center justify-center gap-2 text-4xl font-bold text-brand-text">
                  {score !== undefined ? (
                    <>
                      {score}
                      {showPerModulePass && (
                        <span className="text-2xl" aria-hidden>
                          {score >= 60 ? '✅' : '❌'}
                        </span>
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </p>
                <p className="mt-1 text-xs text-brand-muted">/ 100 Punkte</p>
                {score !== undefined && <ProgressBar value={score} max={100} />}
              </div>
            )
          })}
        </div>

        {/* Detailed feedback per module */}
        {aiFeedback && activeModules.map((mod) => {
          const fb = (aiFeedback as Record<string, unknown>)[mod]
          if (!fb) return null

          if (mod === 'lesen' || mod === 'horen') {
            return <LesenHorenDetails key={mod} module={mod} feedback={fb as LesenHorenFeedback} />
          }
          if (mod === 'schreiben') {
            return <SchreibenDetails key={mod} feedback={fb as SchreibenFeedback} />
          }
          if (mod === 'sprechen') {
            return <SprechenDetails key={mod} feedback={fb as SprechenFeedback} />
          }
          return null
        })}

        {/* Alle Prüfungsteile (Überblick) — only session modules */}
        {sessionModulesOrder.length > 1 && (
          <div className="mb-8 rounded-xl border border-brand-border bg-brand-white p-5 shadow-soft">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">
              Alle Prüfungsteile (Überblick)
            </p>
            <ul className="space-y-2 text-sm text-brand-text">
              {sessionModulesOrder.map((m) => {
                const sc = scores ? (scores as Record<string, number>)[m] : undefined
                const isCompleted = completedSet.has(m)
                const isCurrent = m === data.currentModule

                if (isCompleted && sc !== undefined) {
                  return (
                    <li key={m}>
                      {sc >= 60 ? '✅' : '❌'} {MODULE_LABELS[m]}: {sc}/100
                    </li>
                  )
                }
                if (isCurrent) {
                  return (
                    <li key={m} className="text-brand-gold-dark">
                      🟡 {MODULE_LABELS[m]} — aktuell
                    </li>
                  )
                }
                return (
                  <li key={m} className="text-brand-muted">
                    ⚪ {MODULE_LABELS[m]} — ausstehend
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {overallText && (
          <div className="mb-8 rounded-xl bg-brand-white p-6 shadow-soft">
            <h3 className="mb-3 text-base font-semibold text-brand-text">Gesamtempfehlungen</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">{overallText}</p>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {!isSessionComplete && remainingInSession.length > 0 ? (
              <button
                type="button"
                onClick={() => router.push(`/exam/${params.sessionId}?module=${remainingInSession[0]}`)}
                className="rounded-lg bg-brand-gold px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-gold-dark"
              >
                Test fortsetzen
              </button>
            ) : sessionModulesOrder.length === 1 ? (
              <button
                type="button"
                onClick={() => router.push('/')}
                className="rounded-lg bg-brand-gold px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-gold-dark"
              >
                Anderes Modul trainieren
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push('/')}
                className="rounded-lg bg-brand-gold px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-gold-dark"
              >
                Zur Modulauswahl
              </button>
            )}

            {(!isSessionComplete || sessionModulesOrder.length === 1) && (
              <button
                type="button"
                onClick={() => router.push('/')}
                className="rounded-lg border border-brand-border bg-brand-white px-6 py-2.5 text-sm font-semibold text-brand-text transition hover:bg-brand-surface"
              >
                Zur Modulauswahl
              </button>
            )}
          </div>

          {currentModuleScore !== undefined && currentModuleScore < 60 && shownModule && (
            <button
              type="button"
              onClick={() => {
                if (data.modulesBalance > 0) {
                  setRetakeModalOpen(true)
                } else {
                  router.push('/pricing')
                }
              }}
              className="text-sm text-brand-muted underline underline-offset-2 hover:text-brand-text"
            >
              Prüfung erneut öffnen ({MODULE_LABELS[shownModule]})
            </button>
          )}
        </div>
      </div>

      {shownModule && (
        <RetakeModuleModal
          open={retakeModalOpen}
          onClose={() => setRetakeModalOpen(false)}
          originalSessionId={params.sessionId}
          module={shownModule as 'lesen' | 'horen' | 'schreiben' | 'sprechen'}
          moduleLabel={MODULE_LABELS[shownModule] || shownModule}
          modulesBalance={data?.modulesBalance ?? 0}
        />
      )}
    </div>
  )
}

function LesenHorenDetails({ module, feedback }: { module: string; feedback: LesenHorenFeedback }) {
  if (!feedback.details || !feedback.summary) return null

  const wrongAnswers = Object.entries(feedback.details).filter(([, d]) => !d.isCorrect)

  return (
    <div className="mb-6 rounded-xl bg-brand-white p-6 shadow-soft">
      <h3 className="mb-4 text-base font-semibold text-brand-text">
        {MODULE_LABELS[module]} — Detailergebnisse
      </h3>
      <div className="mb-4 flex items-center gap-4">
        <div className="rounded-lg bg-green-50 px-4 py-2">
          <span className="text-lg font-bold text-green-700">{feedback.summary.correct}</span>
          <span className="ml-1 text-xs text-green-600">richtig</span>
        </div>
        <div className="rounded-lg bg-red-50 px-4 py-2">
          <span className="text-lg font-bold text-brand-red">{feedback.summary.total - feedback.summary.correct}</span>
          <span className="ml-1 text-xs text-red-600">falsch</span>
        </div>
        <div className="rounded-lg bg-brand-surface px-4 py-2">
          <span className="text-lg font-bold text-brand-text">{feedback.summary.total}</span>
          <span className="ml-1 text-xs text-brand-muted">gesamt</span>
        </div>
      </div>

      {wrongAnswers.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">Falsche Antworten</p>
          <div className="space-y-2">
            {wrongAnswers.map(([id, detail]) => (
              <div key={id} className="flex items-center justify-between rounded-lg bg-red-50/50 px-4 py-2.5">
                <span className="text-xs font-medium text-brand-text">Aufgabe {id}</span>
                <div className="flex gap-3 text-xs">
                  <span className="text-red-600">Ihre: <strong>{detail.userAnswer || '—'}</strong></span>
                  <span className="text-green-600">Richtig: <strong>{detail.correctAnswer}</strong></span>
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
  const criteria = [
    ['Aufgabenerfüllung', feedback.criteria.taskFulfillment, 25],
    ['Kohärenz', feedback.criteria.coherence, 25],
    ['Wortschatz', feedback.criteria.vocabulary, 25],
    ['Grammatik', feedback.criteria.grammar, 25],
  ] as const

  return (
    <div className="mb-6 space-y-4">
      <div className="rounded-xl bg-brand-white p-6 shadow-soft">
        <h3 className="mb-4 text-base font-semibold text-brand-text">Schreiben — Bewertung</h3>
        <div className="grid grid-cols-2 gap-3">
          {criteria.map(([label, score, max]) => (
            <div key={label} className="rounded-lg bg-brand-bg p-4">
              <p className="text-xs font-medium text-brand-muted">{label}</p>
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
          <h4 className="mb-3 text-sm font-semibold text-brand-text">KI-Feedback</h4>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">{feedback.comment}</p>
        </div>
      )}
    </div>
  )
}

function SprechenDetails({ feedback }: { feedback: SprechenFeedback }) {
  const criteria = [
    ['Aufgabenerfüllung', feedback.criteria.taskFulfillment, 20],
    ['Flüssigkeit', feedback.criteria.fluency, 20],
    ['Wortschatz', feedback.criteria.vocabulary, 20],
    ['Grammatik', feedback.criteria.grammar, 20],
    ['Aussprache', feedback.criteria.pronunciation, 20],
  ] as const

  return (
    <div className="mb-6 space-y-4">
      <div className="rounded-xl bg-brand-white p-6 shadow-soft">
        <h3 className="mb-4 text-base font-semibold text-brand-text">Sprechen — Bewertung</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {criteria.map(([label, score, max]) => (
            <div key={label} className="rounded-lg bg-brand-bg p-4">
              <p className="text-xs font-medium text-brand-muted">{label}</p>
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
          <h4 className="mb-3 text-sm font-semibold text-brand-text">KI-Feedback</h4>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">{feedback.comment}</p>
        </div>
      )}
    </div>
  )
}
