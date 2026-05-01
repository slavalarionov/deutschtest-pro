'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useExamStore } from '@/store/examStore'
import { ExamTimerDisplay, TimerWarningBanner } from '@/components/exam/ExamTimerDisplay'
import { TimeUpOverlay } from '@/components/exam/TimeUpOverlay'
import { ScorePraedikat } from '@/components/results/ScorePraedikat'
import { CriteriaWithLetters } from '@/components/results/CriteriaWithLetters'
import { getPraedikat } from '@/lib/grading/praedikat'
import type { SchreibenContent, SchreibenFeedback } from '@/types/exam'

const SCHREIBEN_TIME = 60 * 60

// ============================================================
// Shared editorial class atoms
// ============================================================

const SHELL = 'rounded-rad border border-line bg-card'
const EYEBROW = 'font-mono text-[11px] uppercase tracking-wider text-muted'

type HintKey = 'empty' | 'low' | 'almost' | 'enough'

function wordHintStyles(hintKey: HintKey): { text: string; dot: string } {
  switch (hintKey) {
    case 'enough':
      return { text: 'text-accent', dot: 'bg-accent' }
    case 'almost':
      return { text: 'text-ink-soft', dot: 'bg-ink-soft' }
    case 'low':
    case 'empty':
    default:
      return { text: 'text-muted', dot: 'bg-muted' }
  }
}

export function SchreibenModule() {
  const router = useRouter()
  const t = useTranslations('exam.modules.schreiben')
  const tShared = useTranslations('exam.modules.shared')
  const tTimer = useTranslations('exam.timer')
  const tPraedikatLabel = useTranslations('results.praedikat.label')
  const tCriteriaBlock = useTranslations('results.schreiben.criteriaBlock')
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
        <p className="text-muted">{t('loading')}</p>
      </div>
    )
  }

  const targetWords = task.wordCount || 80

  const hintKey: HintKey =
    wordCount === 0
      ? 'empty'
      : wordCount < targetWords * 0.5
        ? 'low'
        : wordCount < targetWords
          ? 'almost'
          : 'enough'

  const hintStyles = wordHintStyles(hintKey)

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {timeUp && session && <TimeUpOverlay detail={postSubmit ? tTimer('redirecting') : undefined} />}

      {/* Header */}
      <div className={`${SHELL} flex items-center justify-between p-4`}>
        <div>
          <p className={EYEBROW}>{t('moduleHint')}</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">{t('moduleTitle')}</h2>
        </div>
        <div className="font-mono tabular-nums">
          <ExamTimerDisplay timeLeft={timeLeft} />
        </div>
      </div>

      {!submitted && <TimerWarningBanner timeLeft={timeLeft} />}

      {/* Task card */}
      <div className={`${SHELL} p-6`}>
        <div className={EYEBROW}>{t('task')}</div>

        {task.context && (
          <div className="mt-3 rounded-rad-sm border border-line bg-surface p-4">
            <p className="text-sm italic leading-relaxed text-ink-soft">{task.context}</p>
          </div>
        )}

        <p className="mt-4 text-sm font-medium leading-relaxed text-ink">{task.prompt}</p>

        {task.requiredPoints && task.requiredPoints.length > 0 && (
          <div className="mt-4 rounded-rad-sm border border-line bg-surface p-4">
            <p className={`mb-2 ${EYEBROW}`}>{t('requiredPoints')}</p>
            <ul className="space-y-1">
              {task.requiredPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink">
                  <span className="mt-0.5 text-muted">—</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Writing area */}
      {!submitted ? (
        <div className={`${SHELL} p-6`}>
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium text-ink">{t('yourText')}</label>
            <span className={`inline-flex items-center gap-2 font-mono text-[11px] tabular-nums ${hintStyles.text}`}>
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${hintStyles.dot}`} />
              {t('wordCount', { count: wordCount, target: targetWords })}
            </span>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('textPlaceholder')}
            rows={12}
            className="w-full resize-none rounded-rad-sm border border-line bg-card p-4 text-sm leading-relaxed text-ink outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent"
          />

          <div className="mt-4 flex items-center justify-between gap-4">
            <p className={EYEBROW}>{t(`wordHint.${hintKey}`)}</p>
            <button
              onClick={handleSubmit}
              disabled={wordCount < 5 || submitting}
              className="rounded-rad bg-ink px-6 py-2.5 text-sm font-semibold text-card transition hover:bg-ink-soft disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-card border-t-transparent" />
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
          <div className={`${SHELL} p-6`}>
            <div className={EYEBROW}>{t('yourText')}</div>
            <div className="mt-3 rounded-rad-sm border border-line bg-surface p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{text}</p>
            </div>
            <p className="mt-2 font-mono text-[11px] tabular-nums text-muted">{t('wordCountFinal', { count: wordCount })}</p>
          </div>

          {error && (
            <div className="rounded-rad border border-error/40 bg-error-soft/40 p-5 text-sm text-error">{error}</div>
          )}

          {feedback && (() => {
            const praedikat = getPraedikat(feedback.score)
            return (
            <>
              {/* Score + Prädikat */}
              <div
                className={`${SHELL} p-6 text-center`}
                style={{ borderLeftWidth: 4, borderLeftColor: praedikat.cssColor }}
              >
                <div className="font-display text-5xl font-medium tabular-nums text-ink">{feedback.score}</div>
                <p className={`mt-2 ${EYEBROW}`}>{t('outOf100')}</p>
                <div className="mt-4 flex justify-center">
                  <ScorePraedikat
                    praedikat={praedikat}
                    translation={tPraedikatLabel(praedikat.level)}
                    size="md"
                  />
                </div>
              </div>

              {/* Criteria with A–E letters */}
              <CriteriaWithLetters
                title={tCriteriaBlock('title')}
                translatedTitle={tCriteriaBlock('translatedTitle')}
                helper={tCriteriaBlock('helper')}
                criteria={[
                  { key: 'taskFulfillment', score: feedback.criteria.taskFulfillment, max: 25,
                    labelDe: tCriteriaBlock('criteria.taskFulfillment'),
                    labelTranslated: tCriteriaBlock('translatedCriteria.taskFulfillment') },
                  { key: 'coherence', score: feedback.criteria.coherence, max: 25,
                    labelDe: tCriteriaBlock('criteria.coherence'),
                    labelTranslated: tCriteriaBlock('translatedCriteria.coherence') },
                  { key: 'vocabulary', score: feedback.criteria.vocabulary, max: 25,
                    labelDe: tCriteriaBlock('criteria.vocabulary'),
                    labelTranslated: tCriteriaBlock('translatedCriteria.vocabulary') },
                  { key: 'grammar', score: feedback.criteria.grammar, max: 25,
                    labelDe: tCriteriaBlock('criteria.grammar'),
                    labelTranslated: tCriteriaBlock('translatedCriteria.grammar') },
                ]}
              />

              {/* AI comment */}
              <div className={`${SHELL} p-6`}>
                <p className={EYEBROW}>{t('aiFeedback')}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                  {feedback.comment}
                </p>
              </div>

              {postSubmit && !timeUp && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => router.push(postSubmit.href)}
                    className="rounded-rad bg-ink px-8 py-3 text-sm font-semibold text-card transition hover:bg-ink-soft focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
                  >
                    {postSubmit.label}
                  </button>
                </div>
              )}
            </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
