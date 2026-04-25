'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useExamStore } from '@/store/examStore'
import type { SprechenContent, SprechenTask, SprechenFeedback } from '@/types/exam'

// ============================================================
// Shared editorial class atoms
// ============================================================

const SHELL = 'rounded-rad border border-line bg-card'
const EYEBROW = 'font-mono text-[11px] uppercase tracking-wider text-muted'

function criteriaBarClassSprechen(score: number): string {
  const pct = (score / 20) * 100
  if (pct >= 70) return 'h-1 bg-accent'
  if (pct >= 50) return 'h-1 bg-muted'
  return 'h-1 bg-error-soft border-t border-error/40'
}

const TEIL_TIMES: Record<SprechenTask['type'], number> = {
  planning: 3 * 60,
  presentation: 3 * 60,
  reaction: 2 * 60,
}

interface TeilResult {
  transcript: string
  feedback: SprechenFeedback | null
  error: string | null
}

function aggregateSprechenFeedback(
  teilResults: Record<number, TeilResult>,
  taskCount: number
): SprechenFeedback | null {
  const fbs: SprechenFeedback[] = []
  for (let i = 0; i < taskCount; i++) {
    const fb = teilResults[i]?.feedback
    if (fb) fbs.push(fb)
  }
  if (fbs.length === 0) return null
  const n = fbs.length
  return {
    score: Math.round(fbs.reduce((s, f) => s + f.score, 0) / n),
    criteria: {
      taskFulfillment: Math.round(fbs.reduce((s, f) => s + f.criteria.taskFulfillment, 0) / n),
      fluency: Math.round(fbs.reduce((s, f) => s + f.criteria.fluency, 0) / n),
      vocabulary: Math.round(fbs.reduce((s, f) => s + f.criteria.vocabulary, 0) / n),
      grammar: Math.round(fbs.reduce((s, f) => s + f.criteria.grammar, 0) / n),
      pronunciation: Math.round(fbs.reduce((s, f) => s + f.criteria.pronunciation, 0) / n),
    },
    comment: fbs.map((f) => f.comment).filter(Boolean).join('\n\n—\n\n'),
  }
}

export function SprechenModule() {
  const router = useRouter()
  const t = useTranslations('exam.modules.sprechen')
  const tShared = useTranslations('exam.modules.shared')
  const { session } = useExamStore()
  const sprechen = session?.content.sprechen as SprechenContent | undefined

  const [currentTeil, setCurrentTeil] = useState(0)
  const [teilResults, setTeilResults] = useState<Record<number, TeilResult>>({})
  const [finalizeDone, setFinalizeDone] = useState(false)
  const [finalizeError, setFinalizeError] = useState<string | null>(null)
  const [postSubmit, setPostSubmit] = useState<{ href: string; label: string } | null>(null)
  const finalizeStarted = useRef(false)
  const aggregateFailed = useRef(false)

  const taskCount = sprechen?.tasks.length ?? 0
  const allDone = Boolean(
    sprechen && sprechen.tasks.every((_, i) => teilResults[i]?.feedback || teilResults[i]?.error)
  )

  useEffect(() => {
    if (!allDone || !session) return
    const agg = aggregateSprechenFeedback(teilResults, taskCount)
    if (!agg) {
      if (!aggregateFailed.current) {
        aggregateFailed.current = true
        setFinalizeError(t('errors.aggregate'))
      }
      return
    }
    aggregateFailed.current = false
    setFinalizeError(null)
    if (finalizeStarted.current) return
    finalizeStarted.current = true
    const aggTranscript = Array.from({ length: taskCount }, (_, i) => teilResults[i]?.transcript ?? '')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .join('\n\n—\n\n')
    ;(async () => {
      try {
        const res = await fetch('/api/exam/finalize-sprechen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.id,
            feedback: agg,
            transcript: aggTranscript || undefined,
          }),
        })
        const data = await res.json()
        if (data.success) {
          setPostSubmit({ href: `/exam/${session.id}/results`, label: tShared('toResults') })
          setFinalizeDone(true)
        } else {
          setFinalizeError(data.error || t('errors.saveFailed'))
          finalizeStarted.current = false
        }
      } catch {
        setFinalizeError(t('errors.network'))
        finalizeStarted.current = false
      }
    })()
  }, [allDone, session, teilResults, taskCount, t, tShared])

  if (!sprechen) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted">{t('loading')}</p>
      </div>
    )
  }

  const tasks = sprechen.tasks
  const task = tasks[currentTeil]
  const result = teilResults[currentTeil]

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Header */}
      <div className={`${SHELL} flex items-center justify-between p-4`}>
        <div>
          <p className={EYEBROW}>{t('moduleHint')}</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">{t('moduleTitle')}</h2>
        </div>
        <div className="flex items-center gap-2">
          {tasks.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition ${
                teilResults[i]?.feedback
                  ? 'bg-accent'
                  : teilResults[i]?.error
                    ? 'bg-error'
                    : i === currentTeil
                      ? 'bg-ink'
                      : 'bg-line'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Teil navigation */}
      <div className={`${SHELL} flex gap-1 p-1`}>
        {tasks.map((_, i) => (
          <button
            key={i}
            data-testid={`teil-tab-${i + 1}`}
            onClick={() => setCurrentTeil(i)}
            className={`flex-1 rounded-rad px-2 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink ${
              currentTeil === i
                ? 'bg-ink text-card'
                : teilResults[i]?.feedback
                  ? 'text-accent-ink hover:bg-surface'
                  : 'text-ink-soft hover:bg-surface'
            }`}
          >
            {tShared('teilLabel', { n: i + 1 })}
          </button>
        ))}
      </div>

      {/* Active Teil */}
      {result?.feedback ? (
        <TeilResultView
          task={task}
          result={result}
        />
      ) : (
        <TeilRecordingView
          task={task}
          level={session!.level}
          onComplete={(res) => {
            setTeilResults((prev) => ({ ...prev, [currentTeil]: res }))
          }}
        />
      )}

      {/* Navigation */}
      <div className={`${SHELL} flex items-center justify-between p-4`}>
        <button
          data-testid="nav-zurueck"
          onClick={() => setCurrentTeil(Math.max(0, currentTeil - 1))}
          disabled={currentTeil === 0}
          className="rounded-rad border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:text-ink disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
        >
          {tShared('back')}
        </button>

        {allDone && (
          <TotalScore results={teilResults} tasks={tasks} />
        )}

        <button
          data-testid="nav-weiter"
          onClick={() => setCurrentTeil(Math.min(tasks.length - 1, currentTeil + 1))}
          disabled={currentTeil === tasks.length - 1}
          className="rounded-rad border border-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-surface disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
        >
          {tShared('next')}
        </button>
      </div>

      {allDone && finalizeError && (
        <p className="inline-flex items-center justify-center self-center rounded-rad border border-error/40 bg-error-soft/40 px-4 py-2 text-center text-sm text-error">
          {finalizeError}
        </p>
      )}

      {allDone && finalizeDone && session && postSubmit && (
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

// ─── Recording View for a single Teil ───

interface TeilRecordingViewProps {
  task: SprechenTask
  level: string
  onComplete: (result: TeilResult) => void
}

function TeilRecordingView({ task, level, onComplete }: TeilRecordingViewProps) {
  const t = useTranslations('exam.modules.sprechen')
  const { session } = useExamStore()
  const title = t(`teil.${task.type}.title`)
  const desc = t(`teil.${task.type}.desc`)
  const tag = t(`teil.${task.type}.tag`)
  const maxTime = TEIL_TIMES[task.type]

  const [phase, setPhase] = useState<'ready' | 'recording' | 'processing'>('ready')
  const [timeLeft, setTimeLeft] = useState(maxTime)
  const [processingStep, setProcessingStep] = useState('')
  const [processingProgress, setProcessingProgress] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    analyserRef.current = null
  }, [])

  const processAudio = useCallback(async (blob: Blob) => {
    setPhase('processing')
    setProcessingProgress(0)

    try {
      setProcessingStep(t('processing.transcribing'))
      setProcessingProgress(15)

      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')
      if (session?.id) {
        formData.append('sessionId', session.id)
      }

      const transcribeRes = await fetch('/api/sprechen/transcribe', {
        method: 'POST',
        body: formData,
      })
      const transcribeData = await transcribeRes.json()

      if (!transcribeData.success || !transcribeData.transcript) {
        onComplete({ transcript: '', feedback: null, error: t('errors.transcribe') })
        return
      }

      const transcript: string = transcribeData.transcript
      setProcessingProgress(50)

      setProcessingStep(t('processing.scoring'))
      setProcessingProgress(60)

      const scoreRes = await fetch('/api/sprechen/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          task_type: task.type,
          task_topic: task.topic,
          task_points: task.points,
          level,
          sessionId: session?.id,
        }),
      })
      const scoreData = await scoreRes.json()
      setProcessingProgress(95)

      if (!scoreData.success) {
        onComplete({ transcript, feedback: null, error: t('errors.scoring') })
        return
      }

      setProcessingProgress(100)
      onComplete({
        transcript,
        feedback: {
          score: scoreData.score,
          criteria: scoreData.criteria,
          comment: scoreData.feedback,
        },
        error: null,
      })
    } catch {
      onComplete({ transcript: '', feedback: null, error: t('errors.network') })
    }
  }, [task, level, onComplete, t, session?.id])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop())
      streamRef.current = null
    }
    cleanup()
  }, [cleanup])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.7
      source.connect(analyser)
      audioCtxRef.current = audioCtx
      analyserRef.current = analyser

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      chunksRef.current = []
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        processAudio(blob)
      }

      mediaRecorder.start()
      setPhase('recording')
      setTimeLeft(maxTime)

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopRecording()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch {
      onComplete({ transcript: '', feedback: null, error: t('errors.micDenied') })
    }
  }, [maxTime, stopRecording, processAudio, onComplete, t])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const isCritical = timeLeft <= 15 && timeLeft > 0
  const isWarning = timeLeft <= 30 && timeLeft > 15

  return (
    <div className="space-y-4">
      {/* Task card */}
      <div className={`${SHELL} p-6`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className={EYEBROW}>{tag}</p>
            <h3 className="mt-2 text-base font-semibold text-ink">{title}</h3>
            <p className="mt-1 text-sm text-ink-soft">{desc}</p>
          </div>
        </div>

        {/* Topic */}
        <div className="mb-4 rounded-rad-sm border border-line bg-surface p-4">
          <p className="text-sm font-semibold text-ink">{task.topic}</p>
        </div>

        {/* Points */}
        <div className="rounded-rad-sm border border-line bg-surface p-4">
          <p className={EYEBROW}>
            {task.type === 'presentation' ? t('slides') : t('pointsLabel')}
          </p>
          <ul className="mt-3 space-y-2">
            {task.points.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-ink">
                <span className="mt-0.5 font-mono text-muted">
                  {task.type === 'presentation' ? `${i + 1}.` : '—'}
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recording controls */}
      <div className={`${SHELL} p-6`}>
        {phase === 'ready' && (
          <div className="flex flex-col items-center">
            <p className="mb-5 text-sm text-ink-soft">{t('clickToStart')}</p>
            <button
              data-testid="sprechen-record-start"
              onClick={startRecording}
              aria-label={t('startRecording')}
              className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-ink text-card transition hover:bg-ink-soft focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </button>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-muted">
              {t('startRecording')}
            </p>
          </div>
        )}

        {phase === 'recording' && (
          <div className="flex flex-col items-center">
            {/* Timer */}
            <div className={`mb-5 inline-block rounded-rad-sm border px-5 py-2 font-mono text-2xl font-medium tabular-nums transition-colors ${
              isCritical
                ? 'animate-timer-pulse border-error bg-error-soft text-error'
                : isWarning
                  ? 'border-accent bg-accent-soft text-accent-ink'
                  : 'border-line bg-card text-ink'
            }`}>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </div>

            {/* Live waveform visualizer */}
            <AudioVisualizer analyser={analyserRef.current} />

            {/* Recording label */}
            <div className="mb-5 flex items-center justify-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-error" />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-error">
                {t('recording')}
              </span>
            </div>

            <button
              data-testid="sprechen-record-stop"
              onClick={stopRecording}
              aria-label={t('stopRecording')}
              className="inline-flex h-16 w-16 animate-timer-pulse items-center justify-center rounded-full bg-error text-card transition hover:bg-error/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-muted">
              {t('stopRecording')}
            </p>
          </div>
        )}

        {phase === 'processing' && (
          <ProcessingView step={processingStep} progress={processingProgress} />
        )}
      </div>
    </div>
  )
}

// ─── Live audio waveform visualizer ───

function AudioVisualizer({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!analyser || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Read accent CSS variables once before the draw loop starts.
    // Fallback to raw oklch if getComputedStyle returns empty string
    // during the first RAF tick before CSS variables are mounted.
    const cs = getComputedStyle(canvas)
    const accentRaw = cs.getPropertyValue('--accent').trim()
    const accentSoftRaw = cs.getPropertyValue('--accent-soft').trim()
    const ACCENT = accentRaw || 'oklch(0.58 0.17 255)'
    const ACCENT_SOFT = accentSoftRaw || 'oklch(0.58 0.17 255 / 0.25)'

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const BAR_COUNT = 48
    const BAR_GAP = 3

    function draw() {
      rafRef.current = requestAnimationFrame(draw)
      analyser!.getByteFrequencyData(dataArray)

      const w = canvas.width
      const h = canvas.height
      ctx!.clearRect(0, 0, w, h)

      const barWidth = (w - (BAR_COUNT - 1) * BAR_GAP) / BAR_COUNT
      const step = Math.floor(bufferLength / BAR_COUNT)

      for (let i = 0; i < BAR_COUNT; i++) {
        let sum = 0
        for (let j = 0; j < step; j++) {
          sum += dataArray[i * step + j]
        }
        const avg = sum / step / 255
        const barH = Math.max(3, avg * h * 0.9)

        const x = i * (barWidth + BAR_GAP)
        const y = (h - barH) / 2

        ctx!.fillStyle = avg > 0.05 ? ACCENT : ACCENT_SOFT
        ctx!.beginPath()
        ctx!.roundRect(x, y, barWidth, barH, 2)
        ctx!.fill()
      }
    }

    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [analyser])

  return (
    <div className="mb-4 flex w-full justify-center">
      <canvas
        ref={canvasRef}
        width={400}
        height={64}
        className="h-16 w-full max-w-md rounded-rad-sm border border-line bg-surface"
      />
    </div>
  )
}

// ─── Processing state with progress ───

function ProcessingView({ step, progress }: { step: string; progress: number }) {
  const t = useTranslations('exam.modules.sprechen.processing')

  const substep =
    progress < 50
      ? t('stepTranscribing')
      : progress < 95
        ? t('stepScoring')
        : t('stepFinalizing')

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {/* Animated spinner */}
      <div className="relative flex h-16 w-16 items-center justify-center">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32" cy="32" r="28"
            fill="none"
            stroke="var(--line)"
            strokeWidth="4"
          />
          <circle
            cx="32" cy="32" r="28"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 28}`}
            strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
            className="transition-all duration-500"
          />
        </svg>
        <span className="absolute font-mono text-sm font-medium tabular-nums text-accent">
          {progress}%
        </span>
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-ink">{step}</p>
        <p className="mt-1 text-xs text-muted">{substep}</p>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full max-w-xs overflow-hidden bg-line">
        <div
          className="h-full bg-accent transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

// ─── Result View for a completed Teil ───

interface TeilResultViewProps {
  task: SprechenTask
  result: TeilResult
}

function TeilResultView({ task, result }: TeilResultViewProps) {
  const t = useTranslations('exam.modules.sprechen')
  const title = t(`teil.${task.type}.title`)
  const { feedback, transcript, error } = result

  return (
    <div className="space-y-4">
      {/* Task summary */}
      <div className={`${SHELL} p-6`}>
        <div className="mb-2 flex items-center gap-3">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent"
            aria-hidden="true"
          >
            <path d="M3 7l3 3 5-6" />
          </svg>
          <h3 className="text-base font-semibold text-ink">{title}</h3>
        </div>
        <p className="text-sm text-ink-soft">{task.topic}</p>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className={`${SHELL} p-6`}>
          <p className={EYEBROW}>{t('transcript')}</p>
          <div className="mt-3 rounded-rad-sm border border-line bg-surface p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
              {transcript}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-rad border border-error/40 bg-error-soft/40 p-5 text-sm text-error">
          {error}
        </div>
      )}

      {feedback && (
        <>
          {/* Score */}
          <div className={`${SHELL} p-6 text-center`}>
            <div className="font-display text-5xl font-medium tabular-nums text-ink">
              {feedback.score}
            </div>
            <p className={`${EYEBROW} mt-3`}>{t('outOf100')}</p>
          </div>

          {/* Criteria */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {([
              ['taskFulfillment', feedback.criteria.taskFulfillment],
              ['fluency', feedback.criteria.fluency],
              ['vocabulary', feedback.criteria.vocabulary],
              ['grammar', feedback.criteria.grammar],
              ['pronunciation', feedback.criteria.pronunciation],
            ] as const).map(([key, score]) => (
              <div key={key} className="flex flex-col gap-2 overflow-hidden rounded-rad border border-line bg-card">
                <div className="flex flex-col gap-2 px-4 pt-4">
                  <p className={EYEBROW}>{t(`criteria.${key}`)}</p>
                  <div className="font-mono text-2xl tabular-nums text-ink">
                    {score}/20
                  </div>
                </div>
                <div className="mt-2 h-1 w-full bg-surface">
                  <div
                    className={criteriaBarClassSprechen(score)}
                    style={{ width: `${(score / 20) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Comment */}
          <div className={`${SHELL} p-6`}>
            <p className={EYEBROW}>{t('aiFeedback')}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
              {feedback.comment}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Total score across all Teile ───

function TotalScore({
  results,
  tasks,
}: {
  results: Record<number, TeilResult>
  tasks: SprechenTask[]
}) {
  const t = useTranslations('exam.modules.sprechen')
  let totalScore = 0
  let count = 0

  tasks.forEach((_, i) => {
    const fb = results[i]?.feedback
    if (fb) {
      totalScore += fb.score
      count++
    }
  })

  const avg = count > 0 ? Math.round(totalScore / count) : 0

  return (
    <div className="text-center">
      <span className="font-mono text-2xl font-bold text-ink tabular-nums">{avg}</span>
      <span className="ml-2 font-mono text-xs text-muted tabular-nums">{t('averagePer100')}</span>
    </div>
  )
}
