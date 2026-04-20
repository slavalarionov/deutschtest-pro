'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useExamStore } from '@/store/examStore'
import { ExamTimerDisplay, TimerWarningBanner } from '@/components/exam/ExamTimerDisplay'
import { TimeUpOverlay } from '@/components/exam/TimeUpOverlay'
import type {
  HorenContent,
  HorenTeil,
  HorenScript,
  HorenTaskRF,
  HorenTaskMC,
} from '@/types/exam'

const TOTAL_TIME = 40 * 60
const TEIL_KEYS = ['teil1', 'teil2', 'teil3', 'teil4'] as const

// ============================================================
// Shared editorial class atoms
// ============================================================

const SHELL = 'rounded-rad border border-line bg-card'
const TASK_SHELL_BASE = 'rounded-rad border p-5 transition'
const TASK_SHELL_NEUTRAL = 'border-line bg-card'
const TASK_SHELL_CORRECT = 'border-accent/40 bg-accent-soft/40'
const TASK_SHELL_WRONG = 'border-error/40 bg-error-soft/40'

const EYEBROW = 'font-mono text-[11px] uppercase tracking-wider text-muted'
const TASK_ID_BADGE =
  'mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-line font-mono text-[11px] text-muted'

const OPTION_BASE =
  'rounded-rad border px-3 py-2 text-left text-xs font-medium transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink'
const OPTION_NEUTRAL = 'border-line text-ink-soft hover:border-ink/40 hover:text-ink'
const OPTION_SELECTED = 'border-ink bg-accent-soft text-ink'
const OPTION_SELECTED_CORRECT = 'border-accent/60 bg-accent-soft text-ink'
const OPTION_SELECTED_WRONG = 'border-error/60 bg-error-soft text-ink'
const OPTION_HINT_CORRECT = 'border-accent/60 bg-card text-ink'
const OPTION_DISABLED = 'cursor-default'

function optionClass(params: {
  isSelected: boolean
  isCorrectAnswer: boolean
  submitted: boolean
  detailIsCorrect?: boolean
}): string {
  const { isSelected, isCorrectAnswer, submitted, detailIsCorrect } = params
  if (isSelected) {
    if (submitted && detailIsCorrect !== undefined) {
      return detailIsCorrect ? OPTION_SELECTED_CORRECT : OPTION_SELECTED_WRONG
    }
    return OPTION_SELECTED
  }
  if (submitted && isCorrectAnswer) {
    return OPTION_HINT_CORRECT
  }
  return OPTION_NEUTRAL
}

function taskShellClass(submitted: boolean, detail?: { isCorrect: boolean }): string {
  if (submitted && detail) {
    return `${TASK_SHELL_BASE} ${detail.isCorrect ? TASK_SHELL_CORRECT : TASK_SHELL_WRONG}`
  }
  return `${TASK_SHELL_BASE} ${TASK_SHELL_NEUTRAL}`
}

function AnswerBadge({ isCorrect }: { isCorrect: boolean }) {
  return isCorrect
    ? <span className="ml-2 font-mono text-xs font-semibold text-ink">✓</span>
    : <span className="ml-2 font-mono text-xs font-semibold text-error">✗</span>
}

function OptionLetter({ letter }: { letter: string }) {
  return (
    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-current font-mono text-[10px] font-semibold lowercase">
      {letter}
    </span>
  )
}

export function HorenModule() {
  const router = useRouter()
  const t = useTranslations('exam.modules.horen')
  const tShared = useTranslations('exam.modules.shared')
  const tTimer = useTranslations('exam.timer')
  const { session, answers, setAnswer } = useExamStore()
  const [currentTeil, setCurrentTeil] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [timeUp, setTimeUp] = useState(false)
  const [postSubmit, setPostSubmit] = useState<{ href: string; label: string } | null>(null)
  const [results, setResults] = useState<{
    score: number
    details: Record<string, { userAnswer: string; correctAnswer: string; isCorrect: boolean }>
    summary: { correct: number; total: number }
  } | null>(null)

  const horen = session?.content.horen as HorenContent | undefined

  const handleSubmit = useCallback(async () => {
    if (!session || submitted) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, type: 'horen', answers }),
      })
      const data = await res.json()
      if (data.success) {
        setResults({ score: data.scores.horen, details: data.details, summary: data.summary })
        setPostSubmit({ href: `/exam/${session.id}/results`, label: tShared('toResults') })
        setSubmitted(true)
      }
    } catch { /* silent */ } finally {
      setSubmitting(false)
    }
  }, [session, answers, submitted, tShared])

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

  if (!horen) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted">{t('loading')}</p>
      </div>
    )
  }

  const teile = [horen.teil1, horen.teil2, horen.teil3, horen.teil4]
  const activeKey = TEIL_KEYS[currentTeil]

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {timeUp && session && <TimeUpOverlay detail={postSubmit ? tTimer('redirecting') : undefined} />}

      {/* Header with timer */}
      <div className={`${SHELL} flex items-center justify-between p-4`}>
        <div>
          <p className={EYEBROW}>{t('moduleHint')}</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">{t('moduleTitle')}</h2>
        </div>
        <div data-testid="exam-timer" className="font-mono tabular-nums">
          <ExamTimerDisplay timeLeft={timeLeft} />
        </div>
      </div>

      {!submitted && <TimerWarningBanner timeLeft={timeLeft} />}

      {/* Teil navigation */}
      <div className={`${SHELL} flex gap-1 p-1`}>
        {TEIL_KEYS.map((key, i) => (
          <button
            key={i}
            data-testid={`teil-tab-${i + 1}`}
            onClick={() => setCurrentTeil(i)}
            className={`flex-1 rounded-rad px-2 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink ${
              currentTeil === i
                ? 'bg-ink text-card'
                : 'text-ink-soft hover:bg-surface'
            }`}
          >
            {t(`${key}.title`)}
          </button>
        ))}
      </div>

      <HorenTeilView
        teil={teile[currentTeil]}
        title={t(`${activeKey}.title`)}
        desc={t(`${activeKey}.desc`)}
        tag={t(`${activeKey}.tag`)}
        number={currentTeil + 1}
        answers={answers}
        setAnswer={setAnswer}
        submitted={submitted}
        results={results}
      />

      {/* Navigation + Submit */}
      <div className={`${SHELL} flex items-center justify-between p-4`}>
        <button
          data-testid="nav-zurueck"
          onClick={() => setCurrentTeil(Math.max(0, currentTeil - 1))}
          disabled={currentTeil === 0}
          className="rounded-rad border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:text-ink disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
        >
          {tShared('back')}
        </button>

        {submitted && results ? (
          <div className="text-center">
            <span className="font-mono text-2xl font-bold text-ink tabular-nums">{results.score}%</span>
            <span className="ml-2 font-mono text-xs text-muted tabular-nums">({results.summary.correct}/{results.summary.total})</span>
          </div>
        ) : (
          currentTeil === 3 ? (
            <button
              data-testid="nav-abgeben"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-rad bg-ink px-6 py-2 text-sm font-semibold text-card transition hover:bg-ink-soft disabled:opacity-60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
            >
              {submitting ? tShared('submitting') : tShared('submitAll')}
            </button>
          ) : null
        )}

        <button
          data-testid="nav-weiter"
          onClick={() => setCurrentTeil(Math.min(3, currentTeil + 1))}
          disabled={currentTeil === 3}
          className="rounded-rad border border-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-surface disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
        >
          {tShared('next')}
        </button>
      </div>

      {submitted && results && postSubmit && !timeUp && (
        <div className="flex justify-center">
          <button
            type="button"
            data-testid="nav-to-results"
            onClick={() => router.push(postSubmit.href)}
            className="rounded-rad bg-ink px-8 py-3 text-sm font-semibold text-card transition hover:bg-ink-soft focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
          >
            {postSubmit.label}
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Shared types
// ============================================================

interface TeilViewProps {
  answers: Record<string, unknown>
  setAnswer: (id: string, val: unknown) => void
  submitted: boolean
  results: {
    details: Record<string, { userAnswer: string; correctAnswer: string; isCorrect: boolean }>
  } | null
}

// ============================================================
// HorenTeilView
// ============================================================

function HorenTeilView({
  teil,
  title,
  desc,
  tag,
  number,
  answers,
  setAnswer,
  submitted,
  results,
}: TeilViewProps & {
  teil: HorenTeil
  title: string
  desc: string
  tag: string
  number: number
}) {
  return (
    <div className="space-y-4">
      <div className={`${SHELL} p-5`}>
        <div className={EYEBROW}>
          Teil {number} · {tag}
        </div>
        <h3 className="mt-1 text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-sm text-ink-soft">{desc}</p>
      </div>

      {teil.scripts.map((script) => (
        <ScriptBlock
          key={script.id}
          script={script}
          answers={answers}
          setAnswer={setAnswer}
          submitted={submitted}
          results={results}
        />
      ))}
    </div>
  )
}

// ============================================================
// ScriptBlock — audio player + tasks for one script
// ============================================================

function ScriptBlock({
  script,
  answers,
  setAnswer,
  submitted,
  results,
}: TeilViewProps & { script: HorenScript }) {
  const tAudio = useTranslations('exam.audio')

  return (
    <div className="space-y-3">
      <div className={`${SHELL} p-5`}>
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-rad-pill border border-line px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {tAudio('scriptHeader', { id: script.id, count: script.playCount })}
          </span>
        </div>
        <HorenAudioPlayer script={script} />
      </div>

      {script.tasks.map((task) =>
        task.type === 'rf' ? (
          <HorenRFRow key={task.id} task={task} answers={answers} setAnswer={setAnswer} submitted={submitted} results={results} />
        ) : (
          <HorenMCRow key={task.id} task={task} answers={answers} setAnswer={setAnswer} submitted={submitted} results={results} />
        )
      )}
    </div>
  )
}

// ============================================================
// HorenAudioPlayer — on-demand TTS, play/pause only, no seeking
// ============================================================

function HorenAudioPlayer({ script }: { script: HorenScript }) {
  const tAudio = useTranslations('exam.audio')
  const audioRef = useRef<HTMLAudioElement>(null)
  const shouldAutoPlay = useRef(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playCount, setPlayCount] = useState(0)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(false)

  const canPlay = playCount < script.playCount

  useEffect(() => {
    const url = audioUrl
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [audioUrl])

  const fetchAudio = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const hasDialogue = Boolean(script.dialogue && script.dialogue.length >= 2)
      const payload = hasDialogue
        ? { dialogue: script.dialogue }
        : {
            text: script.script,
            voiceType: script.voiceType,
          }

      if (!hasDialogue && (!script.script || !script.voiceType)) {
        throw new Error('Missing script or dialogue')
      }

      const res = await fetch('/api/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        console.warn('[Horen audio]', res.status, errText.slice(0, 500))
        throw new Error('Audio generation failed')
      }
      const blob = await res.blob()
      if (!blob.size || blob.type.includes('json')) {
        console.warn('[Horen audio] unexpected body', blob.type, blob.size)
        throw new Error('Invalid audio response')
      }
      const url = URL.createObjectURL(blob)
      shouldAutoPlay.current = true
      setAudioUrl(url)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [script.dialogue, script.script, script.voiceType])

  const togglePlay = useCallback(() => {
    if (loading) return
    const audio = audioRef.current

    if (isPlaying && audio) {
      audio.pause()
      setIsPlaying(false)
      return
    }

    if (!canPlay) return

    if (!audioUrl) {
      fetchAudio()
    } else if (audio) {
      audio.play()
      setIsPlaying(true)
    }
  }, [isPlaying, loading, canPlay, audioUrl, fetchAudio])

  const handleCanPlayThrough = useCallback(() => {
    if (shouldAutoPlay.current) {
      shouldAutoPlay.current = false
      audioRef.current?.play()
      setIsPlaying(true)
    }
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    setProgress((audio.currentTime / audio.duration) * 100)
  }, [])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    setPlayCount((prev) => prev + 1)
    setProgress(0)
    const audio = audioRef.current
    if (audio) audio.currentTime = 0
  }, [])

  const playButtonClass = loading
    ? 'bg-ink/60 text-card'
    : canPlay || isPlaying
      ? 'bg-ink text-card hover:bg-ink-soft'
      : 'cursor-not-allowed border border-line bg-surface text-muted'

  return (
    <div className="flex items-center gap-3 rounded-rad border border-line bg-surface px-4 py-3">
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        onCanPlayThrough={handleCanPlayThrough}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={() => {
          console.warn('[Horen audio] <audio> decode/error')
          setError(true)
          setIsPlaying(false)
        }}
        preload="auto"
      />

      <button
        data-testid="horen-audio-play"
        onClick={togglePlay}
        disabled={(!canPlay && !isPlaying) || loading}
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink ${playButtonClass}`}
        aria-label={loading ? tAudio('loading') : isPlaying ? tAudio('pause') : tAudio('play')}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-card border-t-transparent" />
        ) : isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="3" y="2" width="4" height="12" rx="1" />
            <rect x="9" y="2" width="4" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2l10 6-10 6V2z" />
          </svg>
        )}
      </button>

      <div className="flex-1">
        <div className="h-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <span className="font-mono text-xs tabular-nums text-muted">
        {playCount}/{script.playCount}
      </span>

      {error && <span className="font-mono text-xs text-error">{tAudio('error')}</span>}
    </div>
  )
}

// ============================================================
// HorenRFRow — Richtig/Falsch
// ============================================================

function HorenRFRow({ task, answers, setAnswer, submitted, results }: TeilViewProps & { task: HorenTaskRF }) {
  const tAnswers = useTranslations('exam.modules.horen.answers')
  const key = `h_${task.id}`
  const userAnswer = answers[key] as string | undefined
  const detail = results?.details[key]

  return (
    <div data-testid="exam-task" className={taskShellClass(submitted, detail)}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm leading-relaxed text-ink">
          <span className={TASK_ID_BADGE}>{task.id}</span>
          {task.statement}
          {submitted && detail && <AnswerBadge isCorrect={detail.isCorrect} />}
        </p>
        <div className="grid shrink-0 grid-cols-2 gap-2">
          {(['richtig', 'falsch'] as const).map((opt) => (
            <button
              key={opt}
              data-testid={`answer-${opt}-${key}`}
              onClick={() => !submitted && setAnswer(key, opt)}
              disabled={submitted}
              className={`rounded-rad border px-4 py-1.5 text-xs font-semibold capitalize transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink ${optionClass({
                isSelected: userAnswer === opt,
                isCorrectAnswer: detail?.correctAnswer === opt,
                submitted,
                detailIsCorrect: detail?.isCorrect,
              })} ${submitted ? OPTION_DISABLED : ''}`}
            >
              {tAnswers(opt)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// HorenMCRow — Multiple Choice (a/b/c)
// ============================================================

function HorenMCRow({ task, answers, setAnswer, submitted, results }: TeilViewProps & { task: HorenTaskMC }) {
  const key = `h_${task.id}`
  const userAnswer = answers[key] as string | undefined
  const detail = results?.details[key]

  return (
    <div data-testid="exam-task" className={taskShellClass(submitted, detail)}>
      <p className="mb-3 text-sm font-medium text-ink">
        <span className={TASK_ID_BADGE}>{task.id}</span>
        {task.question}
        {submitted && detail && <AnswerBadge isCorrect={detail.isCorrect} />}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        {(['a', 'b', 'c'] as const).map((opt) => (
          <button
            key={opt}
            data-testid={`answer-option-${key}-${opt}`}
            onClick={() => !submitted && setAnswer(key, opt)}
            disabled={submitted}
            className={`flex-1 ${OPTION_BASE} ${optionClass({
              isSelected: userAnswer === opt,
              isCorrectAnswer: detail?.correctAnswer === opt,
              submitted,
              detailIsCorrect: detail?.isCorrect,
            })} ${submitted ? OPTION_DISABLED : ''}`}
          >
            <OptionLetter letter={opt} />
            {task.options[opt]}
          </button>
        ))}
      </div>
    </div>
  )
}
