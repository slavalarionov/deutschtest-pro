'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useExamStore } from '@/store/examStore'
import { ExamTimerDisplay, TimerWarningBanner } from '@/components/exam/ExamTimerDisplay'
import { TimeUpOverlay } from '@/components/exam/TimeUpOverlay'
import type {
  LesenContent,
  LesenTeil1,
  LesenTeil2,
  LesenTeil3,
  LesenTeil4,
  LesenTeil5,
  LesenTask,
  LesenMCTask,
  LesenTeil4Situation,
  LesenGap,
} from '@/types/exam'

const TOTAL_TIME = 65 * 60
const TEIL_KEYS = ['teil1', 'teil2', 'teil3', 'teil4', 'teil5'] as const

export function LesenModule() {
  const router = useRouter()
  const t = useTranslations('exam.modules.lesen')
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

  const lesen = session?.content.lesen as LesenContent | undefined

  const handleSubmit = useCallback(async () => {
    if (!session || submitted) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, type: 'lesen', answers }),
      })
      const data = await res.json()
      if (data.success) {
        setResults({ score: data.scores.lesen, details: data.details, summary: data.summary })
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

  if (!lesen) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-brand-muted">{t('loading')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {timeUp && session && <TimeUpOverlay detail={postSubmit ? tTimer('redirecting') : undefined} />}

      {/* Header with timer */}
      <div className="flex items-center justify-between rounded-xl bg-brand-white p-4 shadow-soft">
        <div>
          <h2 className="text-lg font-semibold text-brand-text">{t('moduleTitle')}</h2>
          <p className="text-xs text-brand-muted">{t('moduleHint')}</p>
        </div>
        <div data-testid="exam-timer">
          <ExamTimerDisplay timeLeft={timeLeft} />
        </div>
      </div>

      {!submitted && <TimerWarningBanner timeLeft={timeLeft} />}

      {/* Teil navigation */}
      <div className="flex gap-1.5 rounded-xl bg-brand-white p-1.5 shadow-soft">
        {TEIL_KEYS.map((key, i) => (
          <button
            key={i}
            data-testid={`teil-tab-${i + 1}`}
            onClick={() => setCurrentTeil(i)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
              currentTeil === i
                ? 'bg-brand-gold text-white shadow-sm'
                : 'text-brand-muted hover:bg-brand-surface'
            }`}
          >
            {t(`${key}.title`)}
          </button>
        ))}
      </div>

      {/* Active Teil */}
      {currentTeil === 0 && <Teil1View data={lesen.teil1} answers={answers} setAnswer={setAnswer} submitted={submitted} results={results} />}
      {currentTeil === 1 && <Teil2View data={lesen.teil2} answers={answers} setAnswer={setAnswer} submitted={submitted} results={results} />}
      {currentTeil === 2 && <Teil3View data={lesen.teil3} answers={answers} setAnswer={setAnswer} submitted={submitted} results={results} />}
      {currentTeil === 3 && <Teil4View data={lesen.teil4} answers={answers} setAnswer={setAnswer} submitted={submitted} results={results} />}
      {currentTeil === 4 && <Teil5View data={lesen.teil5} answers={answers} setAnswer={setAnswer} submitted={submitted} results={results} />}

      {/* Navigation + Submit */}
      <div className="flex items-center justify-between rounded-xl bg-brand-white p-4 shadow-soft">
        <button
          data-testid="nav-zurueck"
          onClick={() => setCurrentTeil(Math.max(0, currentTeil - 1))}
          disabled={currentTeil === 0}
          className="rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-text transition hover:bg-brand-surface disabled:opacity-30"
        >
          {tShared('back')}
        </button>

        {submitted && results ? (
          <div className="text-center">
            <span className="text-2xl font-bold text-brand-text">{results.score}%</span>
            <span className="ml-2 text-sm text-brand-muted">({results.summary.correct}/{results.summary.total})</span>
          </div>
        ) : (
          currentTeil === 4 ? (
            <button
              data-testid="nav-abgeben"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-brand-gold px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-gold-dark disabled:opacity-70"
            >
              {submitting ? tShared('submitting') : tShared('submitAll')}
            </button>
          ) : null
        )}

        <button
          data-testid="nav-weiter"
          onClick={() => setCurrentTeil(Math.min(4, currentTeil + 1))}
          disabled={currentTeil === 4}
          className="rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-text transition hover:bg-brand-surface disabled:opacity-30"
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
// Shared types for teil views
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
// Teil 1: Blog + richtig/falsch
// ============================================================

function Teil1View({ data, answers, setAnswer, submitted, results }: TeilViewProps & { data: LesenTeil1 }) {
  const t = useTranslations('exam.modules.lesen.teil1')
  const example = data.tasks.find((task) => task.isExample)
  const tasks = data.tasks.filter((task) => !task.isExample)

  return (
    <div className="space-y-4">
      <TeilHeader title={t('title')} desc={t('desc')} tag={t('tag')} />
      <TextBlock text={data.text} />
      {example && <ExampleRF task={example} />}
      {tasks.map((task) => (
        <RFRow key={task.id} task={task} prefix="t1" answers={answers} setAnswer={setAnswer} submitted={submitted} results={results} />
      ))}
    </div>
  )
}

// ============================================================
// Teil 2: Zeitungsartikel + Multiple Choice
// ============================================================

function Teil2View({ data, answers, setAnswer, submitted, results }: TeilViewProps & { data: LesenTeil2 }) {
  const t = useTranslations('exam.modules.lesen.teil2')
  const tShared = useTranslations('exam.modules.shared')
  const example = data.tasks.find((task: LesenMCTask) => task.isExample)
  const tasks = data.tasks.filter((task: LesenMCTask) => !task.isExample)

  return (
    <div className="space-y-4">
      <TeilHeader title={t('title')} desc={t('desc')} tag={t('tag')} />
      <TextBlock text={data.text} />
      {example && (
        <div className="rounded-xl border-2 border-dashed border-brand-border bg-brand-surface/50 p-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">{tShared('example')}</div>
          <p className="mb-2 text-sm font-medium text-brand-text">{example.question}</p>
          <div className="flex gap-2">
            {(['a', 'b', 'c'] as const).map((opt) => (
              <span key={opt} className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${opt === example.answer ? 'border-brand-gold bg-brand-gold/10 text-brand-gold-dark' : 'border-brand-border text-brand-muted'}`}>
                {opt}) {example.options[opt]}
              </span>
            ))}
          </div>
        </div>
      )}
      {tasks.map((task: LesenMCTask) => {
        const key = `t2_${task.id}`
        const userAnswer = answers[key] as string | undefined
        const detail = results?.details[key]
        return (
          <div key={task.id} data-testid="exam-task" className={`rounded-xl p-5 shadow-soft transition ${submitted && detail ? (detail.isCorrect ? 'border-2 border-green-200 bg-green-50/50' : 'border-2 border-red-200 bg-red-50/50') : 'bg-brand-white'}`}>
            <p className="mb-3 text-sm font-medium text-brand-text">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-surface text-xs font-semibold text-brand-muted">{task.id}</span>
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
      })}
    </div>
  )
}

// ============================================================
// Teil 3: Regeltext + ja/nein
// ============================================================

function Teil3View({ data, answers, setAnswer, submitted, results }: TeilViewProps & { data: LesenTeil3 }) {
  const t = useTranslations('exam.modules.lesen.teil3')
  const tShared = useTranslations('exam.modules.shared')
  const tAnswers = useTranslations('exam.modules.lesen.answers')
  const example = data.tasks.find((task) => task.isExample)
  const tasks = data.tasks.filter((task) => !task.isExample)

  return (
    <div className="space-y-4">
      <TeilHeader title={t('title')} desc={t('desc')} tag={t('tag')} />
      <TextBlock text={data.text} />
      {example && (
        <div className="rounded-xl border-2 border-dashed border-brand-border bg-brand-surface/50 p-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">{tShared('example')}</div>
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm text-brand-text"><span className="mr-2 font-semibold text-brand-muted">0</span>{example.statement}</p>
            <div className="flex shrink-0 gap-2">
              <span className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${example.answer === 'ja' ? 'border-brand-gold bg-brand-gold/10 text-brand-gold-dark' : 'border-brand-border text-brand-muted'}`}>{tAnswers('ja')}</span>
              <span className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${example.answer === 'nein' ? 'border-brand-gold bg-brand-gold/10 text-brand-gold-dark' : 'border-brand-border text-brand-muted'}`}>{tAnswers('nein')}</span>
            </div>
          </div>
        </div>
      )}
      {tasks.map((task) => {
        const key = `t3_${task.id}`
        const userAnswer = answers[key] as string | undefined
        const detail = results?.details[key]
        return (
          <div key={task.id} data-testid="exam-task" className={`rounded-xl p-5 shadow-soft transition ${submitted && detail ? (detail.isCorrect ? 'border-2 border-green-200 bg-green-50/50' : 'border-2 border-red-200 bg-red-50/50') : 'bg-brand-white'}`}>
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm leading-relaxed text-brand-text">
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-surface text-xs font-semibold text-brand-muted">{task.id}</span>
                {task.statement}
                {submitted && detail && <AnswerBadge isCorrect={detail.isCorrect} />}
              </p>
              <div className="flex shrink-0 gap-2">
                {(['ja', 'nein'] as const).map((opt) => (
                  <button key={opt} data-testid={`answer-${opt}-${key}`} onClick={() => !submitted && setAnswer(key, opt)} disabled={submitted}
                    className={`rounded-lg border px-4 py-1.5 text-xs font-semibold capitalize transition ${
                      userAnswer === opt
                        ? submitted && detail ? (detail.isCorrect ? 'border-green-500 bg-green-500 text-white' : 'border-red-500 bg-red-500 text-white') : 'border-brand-gold bg-brand-gold text-white'
                        : submitted && detail && detail.correctAnswer === opt ? 'border-green-500 bg-green-50 text-green-700' : 'border-brand-border text-brand-text hover:border-brand-gold/50'
                    } ${submitted ? 'cursor-default' : ''}`}
                  >{tAnswers(opt)}</button>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// Teil 4: Kurztexte + Zuordnung
// ============================================================

function Teil4View({ data, answers, setAnswer, submitted, results }: TeilViewProps & { data: LesenTeil4 }) {
  const t = useTranslations('exam.modules.lesen.teil4')
  const tShared = useTranslations('exam.modules.shared')
  const example = data.situations?.find((s: LesenTeil4Situation) => s.isExample)
  const situations = data.situations?.filter((s: LesenTeil4Situation) => !s.isExample) ?? []
  const textOptions = data.texts?.map((text) => String(text.id)) ?? []

  return (
    <div className="space-y-4">
      <TeilHeader title={t('title')} desc={t('desc')} tag={t('tag')} />

      <div className="grid gap-3 sm:grid-cols-2">
        {data.texts?.map((text) => (
          <div key={String(text.id)} className="rounded-xl bg-brand-white p-4 shadow-soft">
            <span className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-gold/10 text-xs font-bold text-brand-gold-dark">
              {String(text.id).toUpperCase()}
            </span>
            <p className="mt-2 text-sm leading-relaxed text-brand-text">{text.text}</p>
          </div>
        ))}
      </div>

      {example && (
        <div className="rounded-xl border-2 border-dashed border-brand-border bg-brand-surface/50 p-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">{tShared('example')}</div>
          <p className="text-sm text-brand-text">{example.situation}</p>
          <span className="mt-2 inline-block rounded-lg border border-brand-gold bg-brand-gold/10 px-3 py-1 text-xs font-semibold text-brand-gold-dark">
            → {String(example.answer).toUpperCase()}
          </span>
        </div>
      )}

      {situations.map((s: LesenTeil4Situation) => {
        const key = `t4_${s.id}`
        const userAnswer = answers[key] as string | undefined
        const detail = results?.details[key]
        return (
          <div key={s.id} data-testid="exam-task" className={`rounded-xl p-5 shadow-soft transition ${submitted && detail ? (detail.isCorrect ? 'border-2 border-green-200 bg-green-50/50' : 'border-2 border-red-200 bg-red-50/50') : 'bg-brand-white'}`}>
            <p className="mb-3 text-sm text-brand-text">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-surface text-xs font-semibold text-brand-muted">{s.id}</span>
              {s.situation}
              {submitted && detail && <AnswerBadge isCorrect={detail.isCorrect} />}
            </p>
            <div className="flex flex-wrap gap-2">
              {textOptions.map((opt) => (
                <button key={opt} data-testid={`answer-option-${key}-${opt}`} onClick={() => !submitted && setAnswer(key, opt)} disabled={submitted}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase transition ${
                    userAnswer === opt
                      ? submitted && detail ? (detail.isCorrect ? 'border-green-500 bg-green-500 text-white' : 'border-red-500 bg-red-500 text-white') : 'border-brand-gold bg-brand-gold text-white'
                      : submitted && detail && detail.correctAnswer === opt ? 'border-green-500 bg-green-50 text-green-700' : 'border-brand-border text-brand-text hover:border-brand-gold/50'
                  } ${submitted ? 'cursor-default' : ''}`}
                >{opt}</button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// Teil 5: Lückentext + a/b/c
// ============================================================

function Teil5View({ data, answers, setAnswer, submitted, results }: TeilViewProps & { data: LesenTeil5 }) {
  const t = useTranslations('exam.modules.lesen.teil5')
  const tShared = useTranslations('exam.modules.shared')
  const example = data.gaps?.find((g: LesenGap) => g.isExample)
  const gaps = data.gaps?.filter((g: LesenGap) => !g.isExample) ?? []

  return (
    <div className="space-y-4">
      <TeilHeader title={t('title')} desc={t('desc')} tag={t('tag')} />
      <TextBlock text={data.text} />

      {example && (
        <div className="rounded-xl border-2 border-dashed border-brand-border bg-brand-surface/50 p-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">{t('exampleLabel')}</div>
          <div className="flex gap-2">
            {(['a', 'b', 'c'] as const).map((opt) => (
              <span key={opt} className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${opt === example.answer ? 'border-brand-gold bg-brand-gold/10 text-brand-gold-dark' : 'border-brand-border text-brand-muted'}`}>
                {opt}) {example.options[opt]}
              </span>
            ))}
          </div>
        </div>
      )}

      {gaps.map((gap: LesenGap) => {
        const key = `t5_${gap.id}`
        const userAnswer = answers[key] as string | undefined
        const detail = results?.details[key]
        return (
          <div key={gap.id} data-testid="exam-task" className={`rounded-xl p-5 shadow-soft transition ${submitted && detail ? (detail.isCorrect ? 'border-2 border-green-200 bg-green-50/50' : 'border-2 border-red-200 bg-red-50/50') : 'bg-brand-white'}`}>
            <p className="mb-3 text-sm font-medium text-brand-text">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-surface text-xs font-semibold text-brand-muted">{gap.id}</span>
              {tShared('gapLabel', { id: gap.id })}
              {submitted && detail && <AnswerBadge isCorrect={detail.isCorrect} />}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {(['a', 'b', 'c'] as const).map((opt) => (
                <button key={opt} data-testid={`answer-option-${key}-${opt}`} onClick={() => !submitted && setAnswer(key, opt)} disabled={submitted}
                  className={`flex-1 rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${
                    userAnswer === opt
                      ? submitted && detail ? (detail.isCorrect ? 'border-green-500 bg-green-500 text-white' : 'border-red-500 bg-red-500 text-white') : 'border-brand-gold bg-brand-gold text-white'
                      : submitted && detail && detail.correctAnswer === opt ? 'border-green-500 bg-green-50 text-green-700' : 'border-brand-border text-brand-text hover:border-brand-gold/50'
                  } ${submitted ? 'cursor-default' : ''}`}
                ><span className="font-semibold">{opt})</span> {gap.options[opt]}</button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// Shared components
// ============================================================

function TeilHeader({ title, desc, tag }: { title: string; desc: string; tag: string }) {
  return (
    <div className="rounded-xl bg-brand-white p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold text-brand-text">{title}</h3>
        <span className="rounded bg-brand-surface px-2 py-0.5 text-xs font-medium text-brand-muted">{tag}</span>
      </div>
      <p className="mt-1 text-sm text-brand-muted">{desc}</p>
    </div>
  )
}

function TextBlock({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-brand-white p-6 shadow-soft sm:p-8">
      <div className="prose prose-sm max-w-none leading-relaxed text-brand-text">
        {text.split('\n').map((p, i) => (
          <p key={i} className={i > 0 ? 'mt-3' : ''}>{p}</p>
        ))}
      </div>
    </div>
  )
}

function ExampleRF({ task }: { task: LesenTask }) {
  const tShared = useTranslations('exam.modules.shared')
  const tAnswers = useTranslations('exam.modules.lesen.answers')
  return (
    <div className="rounded-xl border-2 border-dashed border-brand-border bg-brand-surface/50 p-5">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">{tShared('example')}</div>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-brand-text"><span className="mr-2 font-semibold text-brand-muted">0</span>{task.statement}</p>
        <div className="flex shrink-0 gap-2">
          <span className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${task.answer === 'richtig' ? 'border-brand-gold bg-brand-gold/10 text-brand-gold-dark' : 'border-brand-border text-brand-muted'}`}>{tAnswers('richtig')}</span>
          <span className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${task.answer === 'falsch' ? 'border-brand-gold bg-brand-gold/10 text-brand-gold-dark' : 'border-brand-border text-brand-muted'}`}>{tAnswers('falsch')}</span>
        </div>
      </div>
    </div>
  )
}

function RFRow({ task, prefix, answers, setAnswer, submitted, results }: {
  task: LesenTask; prefix: string
} & TeilViewProps) {
  const tAnswers = useTranslations('exam.modules.lesen.answers')
  const key = `${prefix}_${task.id}`
  const userAnswer = answers[key] as string | undefined
  const detail = results?.details[key]

  return (
    <div data-testid="exam-task" className={`rounded-xl p-5 shadow-soft transition ${submitted && detail ? (detail.isCorrect ? 'border-2 border-green-200 bg-green-50/50' : 'border-2 border-red-200 bg-red-50/50') : 'bg-brand-white'}`}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm leading-relaxed text-brand-text">
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-surface text-xs font-semibold text-brand-muted">{task.id}</span>
          {task.statement}
          {submitted && detail && <AnswerBadge isCorrect={detail.isCorrect} />}
        </p>
        <div className="flex shrink-0 gap-2">
          {(['richtig', 'falsch'] as const).map((opt) => (
            <button key={opt} data-testid={`answer-${opt}-${key}`} onClick={() => !submitted && setAnswer(key, opt)} disabled={submitted}
              className={`rounded-lg border px-4 py-1.5 text-xs font-semibold capitalize transition ${
                userAnswer === opt
                  ? submitted && detail ? (detail.isCorrect ? 'border-green-500 bg-green-500 text-white' : 'border-red-500 bg-red-500 text-white') : 'border-brand-gold bg-brand-gold text-white'
                  : submitted && detail && detail.correctAnswer === opt ? 'border-green-500 bg-green-50 text-green-700' : 'border-brand-border text-brand-text hover:border-brand-gold/50'
              } ${submitted ? 'cursor-default' : ''}`}
            >{tAnswers(opt)}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
