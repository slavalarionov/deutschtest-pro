'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useExamStore } from '@/store/examStore'
import { ExamTimerDisplay, TimerWarningBanner } from '@/components/exam/ExamTimerDisplay'
import { TimeUpOverlay } from '@/components/exam/TimeUpOverlay'
import { FULL_TEST_MODULE_LABELS, type FullTestModule } from '@/lib/exam/full-test-constants'
import type { SchreibenContent, SchreibenFeedback } from '@/types/exam'

const SCHREIBEN_TIME = 60 * 60

export function SchreibenModule() {
  const router = useRouter()
  const { session } = useExamStore()
  const [text, setText] = useState('')
  const [timeLeft, setTimeLeft] = useState(SCHREIBEN_TIME)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [timeUp, setTimeUp] = useState(false)
  const [postSubmit, setPostSubmit] = useState<{ href: string; label: string } | null>(null)
  const [feedback, setFeedback] = useState<SchreibenFeedback | null>(null)
  const [error, setError] = useState<string | null>(null)

  const schreiben = session?.content.schreiben as SchreibenContent | undefined
  const task = schreiben?.tasks[0]

  const wordCount = useMemo(() => {
    const trimmed = text.trim()
    if (!trimmed) return 0
    return trimmed.split(/\s+/).length
  }, [text])

  const handleSubmit = useCallback(async () => {
    if (!session || !task || submitted) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          type: 'schreiben',
          taskId: task.id,
          text,
        }),
      })
      const data = await res.json()
      if (data.success && data.feedback) {
        setFeedback(data.feedback)
        if (data.nextModule) {
          const nm = data.nextModule as FullTestModule
          setPostSubmit({
            href: `/exam/${session.id}?module=${nm}`,
            label: `Weiter zu ${FULL_TEST_MODULE_LABELS[nm]}`,
          })
        } else {
          setPostSubmit({ href: `/exam/${session.id}/results`, label: 'Zu den Ergebnissen' })
        }
        setSubmitted(true)
      } else {
        setError(data.error || 'Scoring failed')
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }, [session, task, text, submitted])

  useEffect(() => {
    if (submitted || timeLeft <= 0) {
      if (timeLeft <= 0 && !submitted) {
        setTimeUp(true)
        handleSubmit()
      }
      return
    }
    const t = setInterval(() => setTimeLeft((p) => p - 1), 1000)
    return () => clearInterval(t)
  }, [timeLeft, submitted, handleSubmit])

  useEffect(() => {
    if (!timeUp || !submitted || !postSubmit) return
    const t = setTimeout(() => router.push(postSubmit.href), 2600)
    return () => clearTimeout(t)
  }, [timeUp, submitted, postSubmit, router])

  if (!task) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-brand-muted">Schreiben-Modul wird geladen…</p>
      </div>
    )
  }

  const targetWords = task.wordCount || 80

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {timeUp && session && <TimeUpOverlay detail={postSubmit ? 'Sie werden weitergeleitet…' : undefined} />}

      {/* Header */}
      <div className="flex items-center justify-between rounded-xl bg-brand-white p-4 shadow-soft">
        <div>
          <h2 className="text-lg font-semibold text-brand-text">Modul Schreiben</h2>
          <p className="text-xs text-brand-muted">60 Minuten — Schriftlicher Ausdruck</p>
        </div>
        <ExamTimerDisplay timeLeft={timeLeft} />
      </div>

      {!submitted && <TimerWarningBanner timeLeft={timeLeft} />}

      {/* Task card */}
      <div className="rounded-xl bg-brand-white p-6 shadow-soft">
        <span className="mb-3 inline-block rounded bg-brand-surface px-2.5 py-0.5 text-xs font-medium text-brand-muted">
          Aufgabe
        </span>

        {task.context && (
          <div className="mb-4 rounded-lg border border-brand-border bg-brand-bg p-4">
            <p className="text-sm italic leading-relaxed text-brand-muted">{task.context}</p>
          </div>
        )}

        <p className="mb-4 text-sm font-medium leading-relaxed text-brand-text">{task.prompt}</p>

        {task.requiredPoints && task.requiredPoints.length > 0 && (
          <div className="rounded-lg bg-brand-surface p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">
              Schreiben Sie etwas zu folgenden Punkten:
            </p>
            <ul className="space-y-1">
              {task.requiredPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-brand-text">
                  <span className="mt-0.5 text-brand-gold">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Writing area */}
      {!submitted ? (
        <div className="rounded-xl bg-brand-white p-6 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium text-brand-text">Ihr Text</label>
            <span className={`text-xs font-medium tabular-nums ${
              wordCount >= targetWords ? 'text-green-600' : wordCount >= targetWords * 0.5 ? 'text-brand-gold' : 'text-brand-muted'
            }`}>
              {wordCount} / ~{targetWords} Wörter
            </span>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Schreiben Sie hier Ihren Text..."
            rows={12}
            className="w-full resize-none rounded-lg border border-brand-border bg-brand-bg p-4 text-sm leading-relaxed text-brand-text outline-none transition placeholder:text-brand-muted/50 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold"
          />

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-brand-muted">
              {wordCount === 0
                ? 'Beginnen Sie zu schreiben…'
                : wordCount < targetWords * 0.5
                  ? 'Schreiben Sie weiter!'
                  : wordCount < targetWords
                    ? 'Fast genug Wörter.'
                    : 'Gute Länge!'}
            </p>
            <button
              onClick={handleSubmit}
              disabled={wordCount < 5 || submitting}
              className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition ${
                wordCount >= 5 && !submitting
                  ? 'bg-brand-gold text-white hover:bg-brand-gold-dark'
                  : 'cursor-not-allowed bg-brand-border text-brand-muted'
              }`}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Wird bewertet…
                </span>
              ) : (
                'Text abgeben'
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Results */
        <div className="space-y-4">
          {/* Submitted text preview */}
          <div className="rounded-xl bg-brand-white p-6 shadow-soft">
            <h3 className="mb-3 text-sm font-semibold text-brand-muted">Ihr Text</h3>
            <div className="rounded-lg bg-brand-bg p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-text">{text}</p>
            </div>
            <p className="mt-2 text-xs text-brand-muted">{wordCount} Wörter</p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-5 text-sm text-brand-red">{error}</div>
          )}

          {feedback && (
            <>
              {/* Score */}
              <div className="rounded-xl bg-brand-white p-6 text-center shadow-soft">
                <div className="mb-1 text-5xl font-bold text-brand-text">{feedback.score}</div>
                <p className="text-sm text-brand-muted">von 100 Punkten</p>
              </div>

              {/* Criteria breakdown */}
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['Aufgabenerfüllung', feedback.criteria.taskFulfillment],
                  ['Kohärenz', feedback.criteria.coherence],
                  ['Wortschatz', feedback.criteria.vocabulary],
                  ['Grammatik', feedback.criteria.grammar],
                ] as const).map(([label, score]) => (
                  <div key={label} className="rounded-xl bg-brand-white p-4 shadow-soft">
                    <p className="text-xs font-medium text-brand-muted">{label}</p>
                    <div className="mt-1 flex items-end gap-1">
                      <span className="text-2xl font-bold text-brand-text">{score}</span>
                      <span className="mb-0.5 text-xs text-brand-muted">/ 25</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-surface">
                      <div
                        className="h-full rounded-full bg-brand-gold transition-all"
                        style={{ width: `${(score / 25) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* AI comment */}
              <div className="rounded-xl bg-brand-white p-6 shadow-soft">
                <h3 className="mb-3 text-sm font-semibold text-brand-text">KI-Feedback</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">
                  {feedback.comment}
                </p>
              </div>

              {postSubmit && !timeUp && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => router.push(postSubmit.href)}
                    className="inline-block rounded-lg bg-brand-gold px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-gold-dark"
                  >
                    {postSubmit.label}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
