'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useExamStore } from '@/store/examStore'
import { ExamTimerDisplay, TimerWarningBanner } from '@/components/exam/ExamTimerDisplay'
import { TimeUpOverlay } from '@/components/exam/TimeUpOverlay'
import { FULL_TEST_MODULE_LABELS, type FullTestModule } from '@/lib/exam/full-test-constants'
import type {
  HorenContent,
  HorenTeil,
  HorenScript,
  HorenTaskRF,
  HorenTaskMC,
} from '@/types/exam'

const TOTAL_TIME = 40 * 60
const TEIL_LABELS = ['Teil 1', 'Teil 2', 'Teil 3', 'Teil 4'] as const

const TEIL_META = [
  { title: 'Teil 1', desc: 'Sie hören fünf kurze Texte. Sie hören jeden Text zweimal. Richtig oder falsch?', tag: 'Durchsagen' },
  { title: 'Teil 2', desc: 'Sie hören ein Gespräch. Sie hören den Text einmal. Wählen Sie a, b oder c.', tag: 'Interview' },
  { title: 'Teil 3', desc: 'Sie hören ein Gespräch. Sie hören den Text einmal. Richtig oder falsch?', tag: 'Alltagsgespräch' },
  { title: 'Teil 4', desc: 'Sie hören fünf kurze Gespräche. Sie hören jeden Text zweimal. Richtig oder falsch?', tag: 'Gespräche' },
]

export function HorenModule() {
  const router = useRouter()
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
      }
    } catch { /* silent */ } finally {
      setSubmitting(false)
    }
  }, [session, answers, submitted])

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

  if (!horen) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-brand-muted">Hören-Modul wird geladen…</p>
      </div>
    )
  }

  const teile = [horen.teil1, horen.teil2, horen.teil3, horen.teil4]

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {timeUp && session && <TimeUpOverlay detail={postSubmit ? 'Sie werden weitergeleitet…' : undefined} />}

      <div className="flex items-center justify-between rounded-xl bg-brand-white p-4 shadow-soft">
        <div>
          <h2 className="text-lg font-semibold text-brand-text">Modul Hören</h2>
          <p className="text-xs text-brand-muted">40 Minuten — 4 Teile — 20 Aufgaben</p>
        </div>
        <ExamTimerDisplay timeLeft={timeLeft} />
      </div>

      {!submitted && <TimerWarningBanner timeLeft={timeLeft} />}

      <div className="flex gap-1.5 rounded-xl bg-brand-white p-1.5 shadow-soft">
        {TEIL_LABELS.map((label, i) => (
          <button
            key={i}
            onClick={() => setCurrentTeil(i)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
              currentTeil === i
                ? 'bg-brand-gold text-white shadow-sm'
                : 'text-brand-muted hover:bg-brand-surface'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <HorenTeilView
        teil={teile[currentTeil]}
        meta={TEIL_META[currentTeil]}
        answers={answers}
        setAnswer={setAnswer}
        submitted={submitted}
        results={results}
      />

      <div className="flex items-center justify-between rounded-xl bg-brand-white p-4 shadow-soft">
        <button
          onClick={() => setCurrentTeil(Math.max(0, currentTeil - 1))}
          disabled={currentTeil === 0}
          className="rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-text transition hover:bg-brand-surface disabled:opacity-30"
        >
          ← Zurück
        </button>

        {submitted && results ? (
          <div className="text-center">
            <span className="text-2xl font-bold text-brand-text">{results.score}%</span>
            <span className="ml-2 text-sm text-brand-muted">({results.summary.correct}/{results.summary.total})</span>
          </div>
        ) : (
          currentTeil === 3 ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-brand-gold px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-gold-dark disabled:opacity-70"
            >
              {submitting ? 'Wird geprüft…' : 'Alle Antworten abgeben'}
            </button>
          ) : null
        )}

        <button
          onClick={() => setCurrentTeil(Math.min(3, currentTeil + 1))}
          disabled={currentTeil === 3}
          className="rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-text transition hover:bg-brand-surface disabled:opacity-30"
        >
          Weiter →
        </button>
      </div>

      {submitted && results && postSubmit && !timeUp && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => router.push(postSubmit.href)}
            className="rounded-lg bg-brand-gold px-8 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-gold-dark"
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

function AnswerBadge({ isCorrect }: { isCorrect: boolean }) {
  return isCorrect
    ? <span className="ml-2 text-xs font-semibold text-green-600">✓</span>
    : <span className="ml-2 text-xs font-semibold text-red-600">✗</span>
}

// ============================================================
// HorenTeilView
// ============================================================

function HorenTeilView({
  teil,
  meta,
  answers,
  setAnswer,
  submitted,
  results,
}: TeilViewProps & {
  teil: HorenTeil
  meta: { title: string; desc: string; tag: string }
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-brand-white p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-brand-text">{meta.title}</h3>
          <span className="rounded bg-brand-surface px-2 py-0.5 text-xs font-medium text-brand-muted">{meta.tag}</span>
        </div>
        <p className="mt-1 text-sm text-brand-muted">{meta.desc}</p>
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
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-brand-white p-5 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium text-brand-muted">
            Audio {script.id} — {script.playCount === 1 ? '1× abspielen' : `${script.playCount}× abspielen`}
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

  return (
    <div className="flex items-center gap-3 rounded-lg bg-brand-surface px-4 py-3">
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
        onClick={togglePlay}
        disabled={(!canPlay && !isPlaying) || loading}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
          loading
            ? 'bg-brand-gold/70 text-white'
            : canPlay || isPlaying
              ? 'bg-brand-gold text-white hover:bg-brand-gold-dark'
              : 'cursor-not-allowed bg-brand-border text-brand-muted'
        }`}
        aria-label={loading ? 'Wird geladen' : isPlaying ? 'Pause' : 'Abspielen'}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
        <div className="h-1.5 overflow-hidden rounded-full bg-brand-border">
          <div
            className="h-full rounded-full bg-brand-gold transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <span className="text-xs font-medium text-brand-muted">
        {playCount}/{script.playCount}
      </span>

      {error && <span className="text-xs text-brand-red">Fehler</span>}
    </div>
  )
}

// ============================================================
// HorenRFRow — Richtig/Falsch
// ============================================================

function HorenRFRow({ task, answers, setAnswer, submitted, results }: TeilViewProps & { task: HorenTaskRF }) {
  const key = `h_${task.id}`
  const userAnswer = answers[key] as string | undefined
  const detail = results?.details[key]

  return (
    <div className={`rounded-xl p-5 shadow-soft transition ${submitted && detail ? (detail.isCorrect ? 'border-2 border-green-200 bg-green-50/50' : 'border-2 border-red-200 bg-red-50/50') : 'bg-brand-white'}`}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm leading-relaxed text-brand-text">
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-surface text-xs font-semibold text-brand-muted">{task.id}</span>
          {task.statement}
          {submitted && detail && <AnswerBadge isCorrect={detail.isCorrect} />}
        </p>
        <div className="flex shrink-0 gap-2">
          {(['richtig', 'falsch'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => !submitted && setAnswer(key, opt)}
              disabled={submitted}
              className={`rounded-lg border px-4 py-1.5 text-xs font-semibold capitalize transition ${
                userAnswer === opt
                  ? submitted && detail
                    ? detail.isCorrect ? 'border-green-500 bg-green-500 text-white' : 'border-red-500 bg-red-500 text-white'
                    : 'border-brand-gold bg-brand-gold text-white'
                  : submitted && detail && detail.correctAnswer === opt
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-brand-border text-brand-text hover:border-brand-gold/50'
              } ${submitted ? 'cursor-default' : ''}`}
            >
              {opt === 'richtig' ? 'Richtig' : 'Falsch'}
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
    <div className={`rounded-xl p-5 shadow-soft transition ${submitted && detail ? (detail.isCorrect ? 'border-2 border-green-200 bg-green-50/50' : 'border-2 border-red-200 bg-red-50/50') : 'bg-brand-white'}`}>
      <p className="mb-3 text-sm font-medium text-brand-text">
        <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-surface text-xs font-semibold text-brand-muted">{task.id}</span>
        {task.question}
        {submitted && detail && <AnswerBadge isCorrect={detail.isCorrect} />}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        {(['a', 'b', 'c'] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => !submitted && setAnswer(key, opt)}
            disabled={submitted}
            className={`flex-1 rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${
              userAnswer === opt
                ? submitted && detail
                  ? detail.isCorrect ? 'border-green-500 bg-green-500 text-white' : 'border-red-500 bg-red-500 text-white'
                  : 'border-brand-gold bg-brand-gold text-white'
                : submitted && detail && detail.correctAnswer === opt
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-brand-border text-brand-text hover:border-brand-gold/50'
            } ${submitted ? 'cursor-default' : ''}`}
          >
            <span className="font-semibold">{opt})</span> {task.options[opt]}
          </button>
        ))}
      </div>
    </div>
  )
}
