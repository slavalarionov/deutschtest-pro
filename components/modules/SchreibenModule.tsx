'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useExamStore } from '@/store/examStore'
import { ExamTimerDisplay, TimerWarningBanner } from '@/components/exam/ExamTimerDisplay'
import { TimeUpOverlay } from '@/components/exam/TimeUpOverlay'
import type { SchreibenContent, SchreibenFeedback } from '@/types/exam'

const SCHREIBEN_TIME = 60 * 60

export function SchreibenModule() {
  const router = useRouter()
  const t = useTranslations('exam.modules.schreiben')
  const tShared = useTranslations('exam.modules.shared')
  const tTimer = useTranslations('exam.timer')
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
        setPostSubmit({ href: `/exam/${session.id}/results`, label: tShared('toResults') })
        setSubmitted(true)
      } else {
        setError(data.error || t('errors.scoring'))
      }
    } catch {
      setError(t('errors.network'))
    } finally {
      setSubmitting(false)
    }
  }, [session, task, text, submitted, t, tShared])

  useEffect(() => {
    if (submitted || timeLeft <= 0) {
      if (timeLeft <= 0 && !submitted) {
        setTimeUp(true)
        handleSubmit()
      }
      return
    }
    const timer = setInterval(() => setTimeLeft((p) => p - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft, submitted, handleSubmit])

  useEffect(() => {
    if (!timeUp || !submitted || !postSubmit) return
    const timer = setTimeout(() => router.push(postSubmit.href), 2600)
    return () => clearTimeout(timer)
  }, [timeUp, submitted, postSubmit, router])

  if (!task) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-brand-muted">{t('loading')}</p>
      </div>
    )
  }

  const targetWords = task.wordCount || 80

  const hintKey =
    wordCount === 0
      ? 'empty'
      : wordCount < targetWords * 0.5
        ? 'low'
        : wordCount < targetWords
          ? 'almost'
          : 'enough'

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {timeUp && session && <TimeUpOverlay detail={postSubmit ? tTimer('redirecting') : undefined} />}

      {/* Header */}
      <div className="flex items-center justify-between rounded-xl bg-brand-white p-4 shadow-soft">
        <div>
          <h2 className="text-lg font-semibold text-brand-text">{t('moduleTitle')}</h2>
          <p className="text-xs text-brand-muted">{t('moduleHint')}</p>
        </div>
        <ExamTimerDisplay timeLeft={timeLeft} />
      </div>

      {!submitted && <TimerWarningBanner timeLeft={timeLeft} />}

      {/* Task card */}
      <div className="rounded-xl bg-brand-white p-6 shadow-soft">
        <span className="mb-3 inline-block rounded bg-brand-surface px-2.5 py-0.5 text-xs font-medium text-brand-muted">
          {t('task')}
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
              {t('requiredPoints')}
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
            <label className="text-sm font-medium text-brand-text">{t('yourText')}</label>
            <span className={`text-xs font-medium tabular-nums ${
              wordCount >= targetWords ? 'text-green-600' : wordCount >= targetWords * 0.5 ? 'text-brand-gold' : 'text-brand-muted'
            }`}>
              {t('wordCount', { count: wordCount, target: targetWords })}
            </span>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('textPlaceholder')}
            rows={12}
            className="w-full resize-none rounded-lg border border-brand-border bg-brand-bg p-4 text-sm leading-relaxed text-brand-text outline-none transition placeholder:text-brand-muted/50 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold"
          />

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-brand-muted">{t(`wordHint.${hintKey}`)}</p>
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
                  {t('submitting')}
                </span>
              ) : (
                t('submitButton')
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Results */
        <div className="space-y-4">
          {/* Submitted text preview */}
          <div className="rounded-xl bg-brand-white p-6 shadow-soft">
            <h3 className="mb-3 text-sm font-semibold text-brand-muted">{t('yourText')}</h3>
            <div className="rounded-lg bg-brand-bg p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-text">{text}</p>
            </div>
            <p className="mt-2 text-xs text-brand-muted">{t('wordCountFinal', { count: wordCount })}</p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-5 text-sm text-brand-red">{error}</div>
          )}

          {feedback && (
            <>
              {/* Score */}
              <div className="rounded-xl bg-brand-white p-6 text-center shadow-soft">
                <div className="mb-1 text-5xl font-bold text-brand-text">{feedback.score}</div>
                <p className="text-sm text-brand-muted">{t('outOf100')}</p>
              </div>

              {/* Criteria breakdown */}
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['taskFulfillment', feedback.criteria.taskFulfillment],
                  ['coherence', feedback.criteria.coherence],
                  ['vocabulary', feedback.criteria.vocabulary],
                  ['grammar', feedback.criteria.grammar],
                ] as const).map(([key, score]) => (
                  <div key={key} className="rounded-xl bg-brand-white p-4 shadow-soft">
                    <p className="text-xs font-medium text-brand-muted">{t(`criteria.${key}`)}</p>
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
                <h3 className="mb-3 text-sm font-semibold text-brand-text">{t('aiFeedback')}</h3>
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
