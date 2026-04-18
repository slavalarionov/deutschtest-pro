'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useExamStore } from '@/store/examStore'
import type { SprechenContent, SprechenTask, SprechenFeedback } from '@/types/exam'

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
    ;(async () => {
      try {
        const res = await fetch('/api/exam/finalize-sprechen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id, feedback: agg }),
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
        <p className="text-brand-muted">{t('loading')}</p>
      </div>
    )
  }

  const tasks = sprechen.tasks
  const task = tasks[currentTeil]
  const result = teilResults[currentTeil]

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between rounded-xl bg-brand-white p-4 shadow-soft">
        <div>
          <h2 className="text-lg font-semibold text-brand-text">{t('moduleTitle')}</h2>
          <p className="text-xs text-brand-muted">{t('moduleHint')}</p>
        </div>
        <div className="flex items-center gap-2">
          {tasks.map((_, i) => (
            <div
              key={i}
              className={`h-2.5 w-2.5 rounded-full transition ${
                teilResults[i]?.feedback
                  ? 'bg-green-500'
                  : teilResults[i]?.error
                    ? 'bg-brand-red'
                    : i === currentTeil
                      ? 'bg-brand-gold'
                      : 'bg-brand-border'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Teil navigation */}
      <div className="flex gap-1.5 rounded-xl bg-brand-white p-1.5 shadow-soft">
        {tasks.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentTeil(i)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
              currentTeil === i
                ? 'bg-brand-gold text-white shadow-sm'
                : teilResults[i]?.feedback
                  ? 'bg-green-50 text-green-700'
                  : 'text-brand-muted hover:bg-brand-surface'
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
      <div className="flex items-center justify-between rounded-xl bg-brand-white p-4 shadow-soft">
        <button
          onClick={() => setCurrentTeil(Math.max(0, currentTeil - 1))}
          disabled={currentTeil === 0}
          className="rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-text transition hover:bg-brand-surface disabled:opacity-30"
        >
          {tShared('back')}
        </button>

        {allDone && (
          <TotalScore results={teilResults} tasks={tasks} />
        )}

        <button
          onClick={() => setCurrentTeil(Math.min(tasks.length - 1, currentTeil + 1))}
          disabled={currentTeil === tasks.length - 1}
          className="rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-text transition hover:bg-brand-surface disabled:opacity-30"
        >
          {tShared('next')}
        </button>
      </div>

      {allDone && finalizeError && (
        <p className="text-center text-sm text-brand-red">{finalizeError}</p>
      )}

      {allDone && finalizeDone && session && postSubmit && (
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
  }, [task, level, onComplete, t])

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
      <div className="rounded-xl bg-brand-white p-6 shadow-soft">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-brand-text">{title}</h3>
            <p className="mt-1 text-sm text-brand-muted">{desc}</p>
          </div>
          <span className="rounded bg-brand-surface px-2.5 py-0.5 text-xs font-medium text-brand-muted">
            {tag}
          </span>
        </div>

        {/* Topic */}
        <div className="mb-4 rounded-lg border border-brand-border bg-brand-bg p-4">
          <p className="text-sm font-semibold text-brand-text">{task.topic}</p>
        </div>

        {/* Points */}
        <div className="rounded-lg bg-brand-surface p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">
            {task.type === 'presentation' ? t('slides') : t('pointsLabel')}
          </p>
          <ul className="space-y-1.5">
            {task.points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-brand-text">
                <span className="mt-0.5 text-brand-gold">
                  {task.type === 'presentation' ? `${i + 1}.` : '•'}
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recording controls */}
      <div className="rounded-xl bg-brand-white p-6 shadow-soft">
        {phase === 'ready' && (
          <div className="text-center">
            <p className="mb-4 text-sm text-brand-muted">{t('clickToStart')}</p>
            <button
              onClick={startRecording}
              className="inline-flex items-center gap-3 rounded-xl bg-brand-gold px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-gold-dark"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
              {t('startRecording')}
            </button>
          </div>
        )}

        {phase === 'recording' && (
          <div className="text-center">
            {/* Timer */}
            <div className={`mb-4 inline-block rounded-lg px-5 py-2 font-mono text-2xl font-bold tabular-nums transition-colors ${
              isCritical
                ? 'animate-timer-pulse bg-red-100 text-brand-red'
                : isWarning
                  ? 'bg-orange-50 text-orange-600'
                  : 'bg-brand-surface text-brand-text'
            }`}>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </div>

            {/* Live waveform visualizer */}
            <AudioVisualizer analyser={analyserRef.current} />

            {/* Recording label */}
            <div className="mb-5 flex items-center justify-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-red opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-red" />
              </span>
              <span className="text-sm font-medium text-brand-red">{t('recording')}</span>
            </div>

            <button
              onClick={stopRecording}
              className="inline-flex items-center gap-3 rounded-xl bg-brand-red px-8 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              {t('stopRecording')}
            </button>
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

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const BAR_COUNT = 48
    const BAR_GAP = 3
    const GOLD = '#C8A84B'
    const GOLD_LIGHT = '#C8A84B40'

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

        ctx!.fillStyle = avg > 0.05 ? GOLD : GOLD_LIGHT
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
    <div className="mb-4 flex justify-center">
      <canvas
        ref={canvasRef}
        width={400}
        height={64}
        className="h-16 w-full max-w-md rounded-lg bg-brand-bg"
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
            stroke="#F2EFE8"
            strokeWidth="4"
          />
          <circle
            cx="32" cy="32" r="28"
            fill="none"
            stroke="#C8A84B"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 28}`}
            strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
            className="transition-all duration-500"
          />
        </svg>
        <span className="absolute text-sm font-bold text-brand-gold">
          {progress}%
        </span>
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-brand-text">{step}</p>
        <p className="mt-1 text-xs text-brand-muted">{substep}</p>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-brand-surface">
        <div
          className="h-full rounded-full bg-brand-gold transition-all duration-500"
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
      <div className="rounded-xl bg-brand-white p-6 shadow-soft">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <h3 className="text-base font-semibold text-brand-text">{title}</h3>
        </div>
        <p className="text-sm text-brand-muted">{task.topic}</p>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="rounded-xl bg-brand-white p-6 shadow-soft">
          <h4 className="mb-3 text-sm font-semibold text-brand-muted">{t('transcript')}</h4>
          <div className="rounded-lg bg-brand-bg p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-text italic">
              &ldquo;{transcript}&rdquo;
            </p>
          </div>
        </div>
      )}

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

          {/* Criteria */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {([
              ['taskFulfillment', feedback.criteria.taskFulfillment],
              ['fluency', feedback.criteria.fluency],
              ['vocabulary', feedback.criteria.vocabulary],
              ['grammar', feedback.criteria.grammar],
              ['pronunciation', feedback.criteria.pronunciation],
            ] as const).map(([key, score]) => (
              <div key={key} className="rounded-xl bg-brand-white p-4 shadow-soft">
                <p className="text-xs font-medium text-brand-muted">{t(`criteria.${key}`)}</p>
                <div className="mt-1 flex items-end gap-1">
                  <span className="text-2xl font-bold text-brand-text">{score}</span>
                  <span className="mb-0.5 text-xs text-brand-muted">/ 20</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-surface">
                  <div
                    className="h-full rounded-full bg-brand-gold transition-all"
                    style={{ width: `${(score / 20) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Comment */}
          <div className="rounded-xl bg-brand-white p-6 shadow-soft">
            <h4 className="mb-3 text-sm font-semibold text-brand-text">{t('aiFeedback')}</h4>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">
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
      <span className="text-2xl font-bold text-brand-text">{avg}</span>
      <span className="ml-1 text-sm text-brand-muted">{t('averagePer100')}</span>
    </div>
  )
}
