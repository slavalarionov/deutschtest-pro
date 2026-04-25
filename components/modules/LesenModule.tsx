'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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

// ============================================================
// Shared editorial class atoms
// ============================================================

const SHELL = 'rounded-rad border border-line bg-card'
const TASK_SHELL_BASE = 'rounded-rad border p-5 transition'
const TASK_SHELL_NEUTRAL = 'border-line bg-card'
const TASK_SHELL_CORRECT = 'border-accent/40 bg-accent-soft/40'
const TASK_SHELL_WRONG = 'border-error/40 bg-error-soft/40'

// Two-column layout (Teil 1/3/5 on lg+): each column gets its own scroll
// area. Height is fixed so the page itself does not scroll — text and
// questions live side by side without losing position. min-h prevents the
// columns from collapsing on very short viewports.
const TWO_COL_PANE =
  'lg:h-[calc(100vh-22rem)] lg:min-h-[420px] lg:overflow-y-auto chart-scroll'
const TWO_COL_PANE_LEFT = `${TWO_COL_PANE} lg:pr-8`
const TWO_COL_PANE_RIGHT = `${TWO_COL_PANE} lg:border-l lg:border-line lg:pl-8 space-y-4`

const EYEBROW = 'font-mono text-[11px] uppercase tracking-wider text-muted'
const TASK_ID_BADGE =
  'mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-line font-mono text-[11px] text-muted'

// Option button base styles: neutral, selected-correct, selected-wrong,
// not-selected-but-correct (post-submit hint), in-progress (no submit yet).
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
        <p className="text-muted">{t('loading')}</p>
      </div>
    )
  }

  // Teil 1, 3, 5 use a wider canvas on lg+ to host the two-column layout.
  // Teil 2 / 4 stay narrow because their content is structurally fragmented.
  const isWideTeil = currentTeil === 0 || currentTeil === 2 || currentTeil === 4

  return (
    <div
      className={`mx-auto ${
        isWideTeil ? 'max-w-4xl lg:max-w-7xl' : 'max-w-4xl'
      } space-y-5 transition-[max-width] duration-200`}
    >
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

      {/* Active Teil */}
      {currentTeil === 0 && <Teil1View data={lesen.teil1} answers={answers} setAnswer={setAnswer} submitted={submitted} results={results} />}
      {currentTeil === 1 && <Teil2View data={lesen.teil2} answers={answers} setAnswer={setAnswer} submitted={submitted} results={results} />}
      {currentTeil === 2 && <Teil3View data={lesen.teil3} answers={answers} setAnswer={setAnswer} submitted={submitted} results={results} />}
      {currentTeil === 3 && <Teil4View data={lesen.teil4} answers={answers} setAnswer={setAnswer} submitted={submitted} results={results} />}
      {currentTeil === 4 && <Teil5View data={lesen.teil5} answers={answers} setAnswer={setAnswer} submitted={submitted} results={results} />}

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
          currentTeil === 4 ? (
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
          onClick={() => setCurrentTeil(Math.min(4, currentTeil + 1))}
          disabled={currentTeil === 4}
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
    ? <span className="ml-2 font-mono text-xs font-semibold text-ink">✓</span>
    : <span className="ml-2 font-mono text-xs font-semibold text-error">✗</span>
}

function taskShellClass(submitted: boolean, detail?: { isCorrect: boolean }): string {
  if (submitted && detail) {
    return `${TASK_SHELL_BASE} ${detail.isCorrect ? TASK_SHELL_CORRECT : TASK_SHELL_WRONG}`
  }
  return `${TASK_SHELL_BASE} ${TASK_SHELL_NEUTRAL}`
}

// Circular lowercase letter badge (a / b / c) for MC option pills.
function OptionLetter({ letter }: { letter: string }) {
  return (
    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-current font-mono text-[10px] font-semibold lowercase">
      {letter}
    </span>
  )
}

// ============================================================
// Teil 1: Blog + richtig/falsch
// ============================================================

function Teil1View({ data, answers, setAnswer, submitted, results }: TeilViewProps & { data: LesenTeil1 }) {
  const t = useTranslations('exam.modules.lesen.teil1')
  const tShared = useTranslations('exam.modules.shared')
  const example = data.tasks.find((task) => task.isExample)
  const tasks = data.tasks.filter((task) => !task.isExample)

  return (
    <div className="space-y-4">
      <TeilHeader number={1} title={t('title')} desc={t('desc')} tag={t('tag')} />
      <div className="lg:grid lg:grid-cols-2 lg:gap-0">
        <div tabIndex={0} role="region" aria-label={tShared('paneTextAria')} className={TWO_COL_PANE_LEFT}>
          <TextBlock text={data.text} />
        </div>
        <div tabIndex={0} role="region" aria-label={tShared('paneQuestionsAria')} className={TWO_COL_PANE_RIGHT}>
          {example && <ExampleRF task={example} />}
          {tasks.map((task) => (
            <RFRow key={task.id} task={task} prefix="t1" answers={answers} setAnswer={setAnswer} submitted={submitted} results={results} />
          ))}
        </div>
      </div>
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
      <TeilHeader number={2} title={t('title')} desc={t('desc')} tag={t('tag')} />
      <TextBlock text={data.text} />
      {example && (
        <div className="rounded-rad border border-dashed border-line bg-surface/50 p-5">
          <div className={EYEBROW}>{tShared('example')}</div>
          <p className="mb-3 mt-2 text-sm font-medium text-ink">{example.question}</p>
          <div className="flex flex-wrap gap-2">
            {(['a', 'b', 'c'] as const).map((opt) => (
              <span
                key={opt}
                className={`inline-flex items-center rounded-rad border px-3 py-1.5 text-xs font-medium ${
                  opt === example.answer ? 'border-accent/60 bg-accent-soft text-ink' : 'border-line text-muted'
                }`}
              >
                <OptionLetter letter={opt} />
                {example.options[opt]}
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
          <div key={task.id} data-testid="exam-task" className={taskShellClass(submitted, detail)}>
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
      <TeilHeader number={3} title={t('title')} desc={t('desc')} tag={t('tag')} />
      <div className="lg:grid lg:grid-cols-2 lg:gap-0">
        <div tabIndex={0} role="region" aria-label={tShared('paneTextAria')} className={TWO_COL_PANE_LEFT}>
          <TextBlock text={data.text} />
        </div>
        <div tabIndex={0} role="region" aria-label={tShared('paneQuestionsAria')} className={TWO_COL_PANE_RIGHT}>
          {example && (
            <div className="rounded-rad border border-dashed border-line bg-surface/50 p-5">
              <div className={EYEBROW}>{tShared('example')}</div>
              <div className="mt-2 flex items-start justify-between gap-4">
                <p className="text-sm text-ink">
                  <span className="mr-2 font-mono text-xs text-muted">0</span>
                  {example.statement}
                </p>
                <div className="flex shrink-0 gap-2">
                  <span className={`rounded-rad border px-3 py-1.5 text-xs font-semibold ${example.answer === 'ja' ? 'border-accent/60 bg-accent-soft text-ink' : 'border-line text-muted'}`}>{tAnswers('ja')}</span>
                  <span className={`rounded-rad border px-3 py-1.5 text-xs font-semibold ${example.answer === 'nein' ? 'border-accent/60 bg-accent-soft text-ink' : 'border-line text-muted'}`}>{tAnswers('nein')}</span>
                </div>
              </div>
            </div>
          )}
          {tasks.map((task) => {
            const key = `t3_${task.id}`
            const userAnswer = answers[key] as string | undefined
            const detail = results?.details[key]
            return (
              <div key={task.id} data-testid="exam-task" className={taskShellClass(submitted, detail)}>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm leading-relaxed text-ink">
                    <span className={TASK_ID_BADGE}>{task.id}</span>
                    {task.statement}
                    {submitted && detail && <AnswerBadge isCorrect={detail.isCorrect} />}
                  </p>
                  <div className="grid shrink-0 grid-cols-2 gap-2">
                    {(['ja', 'nein'] as const).map((opt) => (
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
          })}
        </div>
      </div>
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
      <TeilHeader number={4} title={t('title')} desc={t('desc')} tag={t('tag')} />

      <div className="grid gap-3 sm:grid-cols-2">
        {data.texts?.map((text) => (
          <div key={String(text.id)} className={`${SHELL} p-4`}>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-ink/20 font-mono text-[11px] font-semibold text-ink">
              {String(text.id).toUpperCase()}
            </span>
            <p className="mt-2 text-sm leading-relaxed text-ink">{text.text}</p>
          </div>
        ))}
      </div>

      {example && (
        <div className="rounded-rad border border-dashed border-line bg-surface/50 p-5">
          <div className={EYEBROW}>{tShared('example')}</div>
          <p className="mt-2 text-sm text-ink">{example.situation}</p>
          <span className="mt-3 inline-flex items-center rounded-rad border border-accent/60 bg-accent-soft px-3 py-1 font-mono text-xs font-semibold text-ink">
            → {String(example.answer).toUpperCase()}
          </span>
        </div>
      )}

      {situations.map((s: LesenTeil4Situation) => {
        const key = `t4_${s.id}`
        const userAnswer = answers[key] as string | undefined
        const detail = results?.details[key]
        return (
          <div key={s.id} data-testid="exam-task" className={taskShellClass(submitted, detail)}>
            <p className="mb-3 text-sm text-ink">
              <span className={TASK_ID_BADGE}>{s.id}</span>
              {s.situation}
              {submitted && detail && <AnswerBadge isCorrect={detail.isCorrect} />}
            </p>
            <div className="flex flex-wrap gap-2">
              {textOptions.map((opt) => (
                <button
                  key={opt}
                  data-testid={`answer-option-${key}-${opt}`}
                  onClick={() => !submitted && setAnswer(key, opt)}
                  disabled={submitted}
                  className={`inline-flex items-center rounded-rad border px-3 py-1.5 text-xs font-semibold uppercase transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink ${optionClass({
                    isSelected: userAnswer === opt,
                    isCorrectAnswer: detail?.correctAnswer === opt,
                    submitted,
                    detailIsCorrect: detail?.isCorrect,
                  })} ${submitted ? OPTION_DISABLED : ''}`}
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current font-mono text-[10px]">
                    {opt.toUpperCase()}
                  </span>
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
// Teil 5: Lückentext + a/b/c
// ============================================================

function Teil5View({ data, answers, setAnswer, submitted, results }: TeilViewProps & { data: LesenTeil5 }) {
  const t = useTranslations('exam.modules.lesen.teil5')
  const tShared = useTranslations('exam.modules.shared')
  const example = data.gaps?.find((g: LesenGap) => g.isExample)
  const gaps = data.gaps?.filter((g: LesenGap) => !g.isExample) ?? []

  // activeGapId — gap currently hovered or focused via the right column
  // (reset to null on leave/blur). answeredGapIds — set of gap ids the
  // user has already chosen an option for; derived from the global answers
  // map. Together they drive the highlight state of the inline gap markers
  // in the left column.
  const [activeGapId, setActiveGapId] = useState<number | null>(null)
  const answeredGapIds = useMemo(() => {
    const set = new Set<number>()
    for (const k of Object.keys(answers)) {
      if (!k.startsWith('t5_')) continue
      const id = Number(k.slice(3))
      if (Number.isFinite(id)) set.add(id)
    }
    return set
  }, [answers])

  return (
    <div className="space-y-4">
      <TeilHeader number={5} title={t('title')} desc={t('desc')} tag={t('tag')} />
      <div className="lg:grid lg:grid-cols-2 lg:gap-0">
        <div tabIndex={0} role="region" aria-label={tShared('paneTextAria')} className={TWO_COL_PANE_LEFT}>
          <TextBlockWithGaps
            text={data.text}
            activeGapId={submitted ? null : activeGapId}
            answeredGapIds={answeredGapIds}
          />
        </div>
        <div tabIndex={0} role="region" aria-label={tShared('paneQuestionsAria')} className={TWO_COL_PANE_RIGHT}>
          {example && (
            <div className="rounded-rad border border-dashed border-line bg-surface/50 p-5">
              <div className={EYEBROW}>{t('exampleLabel')}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(['a', 'b', 'c'] as const).map((opt) => (
                  <span
                    key={opt}
                    className={`inline-flex items-center rounded-rad border px-3 py-1.5 text-xs font-medium ${
                      opt === example.answer ? 'border-accent/60 bg-accent-soft text-ink' : 'border-line text-muted'
                    }`}
                  >
                    <OptionLetter letter={opt} />
                    {example.options[opt]}
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
              <div
                key={gap.id}
                data-testid="exam-task"
                data-question-id={gap.id}
                className={taskShellClass(submitted, detail)}
                onMouseEnter={() => setActiveGapId(gap.id)}
                onMouseLeave={() => setActiveGapId((id) => (id === gap.id ? null : id))}
                onFocusCapture={() => setActiveGapId(gap.id)}
                onBlurCapture={(e) => {
                  // Only clear when focus actually leaves this row.
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setActiveGapId((id) => (id === gap.id ? null : id))
                  }
                }}
              >
                <p className="mb-3 text-sm font-medium text-ink">
                  <span className={TASK_ID_BADGE}>{gap.id}</span>
                  {tShared('gapLabel', { id: gap.id })}
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
                      {gap.options[opt]}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Inline gap markers (___(N)___) are wrapped in a <span data-gap-id> so the
// right column can paint them on hover/focus and keep them tinted while an
// answer is selected. The visible text stays identical to the source — we
// only style the wrapper, never replace the marker contents.
function TextBlockWithGaps({
  text,
  activeGapId,
  answeredGapIds,
}: {
  text: string
  activeGapId: number | null
  answeredGapIds: Set<number>
}) {
  const paragraphs = text.split('\n')
  const gapRegex = /___\((\d+)\)___/g

  return (
    <div className={`${SHELL} p-6 sm:p-8`}>
      <div className="prose prose-sm max-w-none leading-relaxed text-ink">
        {paragraphs.map((paragraph, pi) => {
          const parts = paragraph.split(gapRegex)
          return (
            <p key={pi} className={pi > 0 ? 'mt-3' : ''}>
              {parts.map((chunk, ci) => {
                // Even indices = plain text, odd indices = gap id captured by the regex.
                if (ci % 2 === 0) return <span key={ci}>{chunk}</span>
                const id = Number(chunk)
                const isAnswered = answeredGapIds.has(id)
                const isActive = activeGapId === id
                const cls = isAnswered
                  ? 'border-accent/60 bg-accent-soft/60 text-ink'
                  : isActive
                    ? 'border-accent/40 bg-accent-soft/40 text-ink'
                    : 'border-line text-muted'
                return (
                  <span
                    key={ci}
                    data-gap-id={id}
                    className={`mx-0.5 rounded-rad border px-1.5 py-0.5 font-mono text-xs transition-colors ${cls}`}
                  >
                    ___({id})___
                  </span>
                )
              })}
            </p>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// Shared components
// ============================================================

function TeilHeader({ number, title, desc, tag }: { number: number; title: string; desc: string; tag: string }) {
  return (
    <div className={`${SHELL} p-5`}>
      <div className={EYEBROW}>
        Teil {number} · {tag}
      </div>
      <h3 className="mt-1 text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-ink-soft">{desc}</p>
    </div>
  )
}

function TextBlock({ text }: { text: string }) {
  return (
    <div className={`${SHELL} p-6 sm:p-8`}>
      <div className="prose prose-sm max-w-none leading-relaxed text-ink">
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
    <div className="rounded-rad border border-dashed border-line bg-surface/50 p-5">
      <div className={EYEBROW}>{tShared('example')}</div>
      <div className="mt-2 flex items-start justify-between gap-4">
        <p className="text-sm text-ink">
          <span className="mr-2 font-mono text-xs text-muted">0</span>
          {task.statement}
        </p>
        <div className="flex shrink-0 gap-2">
          <span className={`rounded-rad border px-3 py-1.5 text-xs font-semibold ${task.answer === 'richtig' ? 'border-accent/60 bg-accent-soft text-ink' : 'border-line text-muted'}`}>{tAnswers('richtig')}</span>
          <span className={`rounded-rad border px-3 py-1.5 text-xs font-semibold ${task.answer === 'falsch' ? 'border-accent/60 bg-accent-soft text-ink' : 'border-line text-muted'}`}>{tAnswers('falsch')}</span>
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
