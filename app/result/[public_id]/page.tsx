import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createServerClient } from '@/lib/supabase-server'
import { formatEditorialDate } from '@/lib/format/date'
import { userInputSchema } from '@/types/exam'
import type { Locale } from '@/i18n/request'

type Module = 'lesen' | 'horen' | 'schreiben' | 'sprechen'
const VALID_MODULES = new Set<Module>(['lesen', 'horen', 'schreiben', 'sprechen'])

interface PublicResultData {
  module: Module
  level: string
  score: number | undefined
  scores: Record<string, number> | null
  aiFeedback: Record<string, unknown> | null
  userInput: unknown
  submittedAt: string | null
  locale: Locale
}

async function loadPublicResult(publicId: string): Promise<PublicResultData | null> {
  const supabase = createServerClient()
  const { data: session } = await supabase
    .from('exam_sessions')
    .select('id, user_id, level, mode, public_id, is_public')
    .eq('public_id', publicId)
    .maybeSingle()

  if (!session || !session.is_public) return null
  const moduleKey = (session.mode as Module)
  if (!VALID_MODULES.has(moduleKey)) return null

  const { data: attempt } = await supabase
    .from('user_attempts')
    .select('scores, ai_feedback, user_input, submitted_at')
    .eq('session_id', session.id)
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (!attempt || !attempt.submitted_at) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_language')
    .eq('id', session.user_id)
    .maybeSingle()

  const scores = (attempt.scores as Record<string, number> | null) ?? null
  const score = scores ? scores[moduleKey] : undefined

  return {
    module: moduleKey,
    level: session.level,
    score,
    scores,
    aiFeedback: attempt.ai_feedback as Record<string, unknown> | null,
    userInput: attempt.user_input,
    submittedAt: attempt.submitted_at,
    locale: (profile?.preferred_language as Locale | undefined) ?? 'de',
  }
}

type ScoreTone = 'high' | 'midHigh' | 'midLow' | 'low'

function getScoreTone(score: number): { tone: ScoreTone; color: string; passed: boolean } {
  if (score >= 80) return { tone: 'high',    color: 'var(--success)', passed: true  }
  if (score >= 60) return { tone: 'midHigh', color: 'var(--accent)',  passed: true  }
  if (score >= 40) return { tone: 'midLow',  color: 'var(--warn)',    passed: false }
  return                  { tone: 'low',     color: 'var(--error)',   passed: false }
}

export async function generateMetadata(
  { params }: { params: { public_id: string } },
): Promise<Metadata> {
  const data = await loadPublicResult(params.public_id)
  if (!data) {
    return { title: 'DeutschTest.pro' }
  }

  const tModules = await getTranslations({ locale: data.locale, namespace: 'modules' })
  const moduleLabel = tModules(data.module)
  const score = data.score ?? '—'
  const title = `${moduleLabel} — ${score}/100 · Goethe ${data.level.toUpperCase()} · DeutschTest.pro`
  const description = `Mein Ergebnis: ${moduleLabel} ${score}/100. Goethe-Zertifikat ${data.level.toUpperCase()}. Mit DeutschTest.pro vorbereitet — KI-basiertes Prüfungstraining.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'DeutschTest.pro',
      locale: 'de_DE',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: { index: false, follow: false },
  }
}

export default async function PublicResultPage(
  { params }: { params: { public_id: string } },
) {
  const data = await loadPublicResult(params.public_id)
  if (!data) notFound()

  const { locale, module: moduleKey, level, score, scores, aiFeedback, userInput, submittedAt } = data

  const [t, tModules, tDetail, tScoreCard, tUserInput, tLesenHoren, tSchreiben, tSprechen, tPublic] = await Promise.all([
    getTranslations({ locale, namespace: 'results' }),
    getTranslations({ locale, namespace: 'modules' }),
    getTranslations({ locale, namespace: 'dashboard.testDetail' }),
    getTranslations({ locale, namespace: 'results.scoreCard' }),
    getTranslations({ locale, namespace: 'results.userInput' }),
    getTranslations({ locale, namespace: 'results.lesenHoren' }),
    getTranslations({ locale, namespace: 'results.schreiben' }),
    getTranslations({ locale, namespace: 'results.sprechen' }),
    getTranslations({ locale, namespace: 'results.public' }),
  ])

  const moduleLabel = tModules(moduleKey)
  const formattedDate = submittedAt ? formatEditorialDate(submittedAt, locale) : null
  const formattedTime = submittedAt
    ? new Date(submittedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : null

  const eyebrow = formattedDate && formattedTime
    ? tScoreCard('eyebrow', {
        module: moduleLabel.toLocaleUpperCase(locale),
        level: level.toUpperCase(),
        date: formattedDate,
        time: formattedTime,
      })
    : `${moduleLabel.toLocaleUpperCase(locale)} · ${level.toUpperCase()}`

  const tone = score !== undefined ? getScoreTone(score) : null
  const fb = aiFeedback?.[moduleKey] as Record<string, unknown> | undefined
  const homeHref = locale === 'de' ? '/' : `/${locale}`

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
        {/* ====== Editorial header ====== */}
        <header className="flex items-baseline justify-between gap-4">
          <div className="space-y-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {tDetail('eyebrow', { level })}
            </div>
            <h1 className="font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
              {moduleLabel}.
            </h1>
          </div>
          <Link
            href={homeHref}
            className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-ink"
          >
            DeutschTest.pro
          </Link>
        </header>

        {/* ====== Hero score card ====== */}
        <div
          data-testid="result-score-hero"
          className="rounded-rad border border-l-2 border-line bg-card p-6 sm:border-l-4 sm:p-10"
          style={tone ? { borderLeftColor: tone.color } : undefined}
        >
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {eyebrow}
          </div>
          {score === undefined ? (
            <div className="mt-6 font-display text-[80px] leading-none tracking-[-0.04em] text-ink tabular-nums sm:text-[120px] md:text-[140px]">
              —
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-6 sm:mt-8 sm:flex-row sm:items-center sm:gap-10">
              <div className="flex items-end gap-3">
                <div className="font-display text-[80px] leading-none tracking-[-0.04em] text-ink tabular-nums sm:text-[120px] md:text-[140px]">
                  {score}
                </div>
                <div className="pb-2 font-mono text-sm text-muted sm:pb-4">
                  {tScoreCard('outOf')}
                </div>
              </div>
              {tone && (
                <div data-passed={tone.passed ? 'true' : 'false'} className="space-y-1">
                  <div className="font-display text-3xl leading-tight tracking-[-0.02em] text-ink sm:text-4xl">
                    {tScoreCard(`summary.${tone.tone}.title`)}
                  </div>
                  <div className="text-base text-muted">
                    {tScoreCard(`summary.${tone.tone}.subtitle`)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ====== User input ====== */}
        {(moduleKey === 'schreiben' || moduleKey === 'sprechen') && (() => {
          const parsed = userInputSchema.safeParse(userInput)
          const data = parsed.success ? parsed.data : {}
          const payload = moduleKey === 'schreiben' ? data.schreiben : data.sprechen
          const text = moduleKey === 'schreiben'
            ? (payload as { text?: string } | undefined)?.text?.trim()
            : (payload as { transcript?: string } | undefined)?.transcript?.trim()
          const wordCount = moduleKey === 'schreiben'
            ? (payload as { wordCount?: number; text?: string } | undefined)?.wordCount
              ?? text?.split(/\s+/).length
            : undefined
          const eyebrowLabel = moduleKey === 'schreiben'
            ? tUserInput('schreibenLabel')
            : tUserInput('sprechenLabel')

          return (
            <section className="rounded-rad border border-line bg-card p-6 sm:p-8">
              <div className="flex items-baseline justify-between gap-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  {eyebrowLabel}
                </div>
                {text && moduleKey === 'schreiben' && wordCount !== undefined && (
                  <div className="font-mono text-xs tabular-nums text-muted">
                    {tUserInput('wordCount', { count: wordCount })}
                  </div>
                )}
              </div>
              {text ? (
                <div className="mt-4 border-l-2 border-line pl-4">
                  <p className="whitespace-pre-wrap text-base leading-relaxed text-ink">{text}</p>
                </div>
              ) : (
                <div className="mt-4 border-l-2 border-line pl-4">
                  <p className="text-base leading-relaxed text-ink-soft">
                    {tUserInput('notSavedLabel')}
                  </p>
                </div>
              )}
            </section>
          )
        })()}

        {/* ====== Module-specific feedback ====== */}
        {fb && moduleKey === 'lesen' && <LesenHorenDetails feedback={fb} t={tLesenHoren} tDetail={tDetail} />}
        {fb && moduleKey === 'horen' && <LesenHorenDetails feedback={fb} t={tLesenHoren} tDetail={tDetail} />}
        {fb && moduleKey === 'schreiben' && <SchreibenDetails feedback={fb} t={tSchreiben} tDetail={tDetail} />}
        {fb && moduleKey === 'sprechen' && <SprechenDetails feedback={fb} t={tSprechen} tDetail={tDetail} />}

        {/* ====== Footer CTA ====== */}
        <section className="rounded-rad border border-line bg-surface p-8 text-center sm:p-10">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            DeutschTest.pro
          </div>
          <h2 className="mt-4 font-display text-3xl leading-tight tracking-[-0.02em] text-ink sm:text-4xl">
            {tPublic('cta')}
          </h2>
          <p className="mt-3 text-sm text-muted">{tPublic('ctaSubtitle')}</p>
          <Link
            href={homeHref}
            className="mt-6 inline-flex rounded-rad-pill bg-ink px-8 py-3 text-sm font-medium text-page transition-colors hover:bg-ink/90"
          >
            {tPublic('ctaButton')}
          </Link>
        </section>
      </div>
    </div>
  )
}

// — Module feedback subcomponents (server-side, inline) —

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="mt-3 h-2 overflow-hidden rounded-rad-pill bg-line">
      <div className="h-full rounded-rad-pill bg-accent" style={{ width: `${pct}%` }} />
    </div>
  )
}

type T = Awaited<ReturnType<typeof getTranslations>>

function LesenHorenDetails({
  feedback,
  t,
  tDetail,
}: {
  feedback: Record<string, unknown>
  t: T
  tDetail: T
}) {
  const details = feedback.details as
    | Record<string, { userAnswer: string; correctAnswer: string; isCorrect: boolean }>
    | undefined
  const summary = feedback.summary as
    | { correct: number; total: number; score: number }
    | undefined
  if (!details || !summary) return null

  const entries = Object.entries(details)
  const wrongCount = summary.total - summary.correct

  return (
    <div className="space-y-6">
      <div className="rounded-rad border border-line bg-surface p-8">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {tDetail('overviewEyebrow')}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-0">
          <div>
            <div className="font-display text-3xl text-ink">{summary.correct}</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted">
              {t('correct').toUpperCase()}
            </div>
          </div>
          <div className="border-l border-line pl-8">
            <div className={`font-display text-3xl ${wrongCount > 0 ? 'text-muted' : 'text-ink'}`}>
              {wrongCount}
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted">
              {t('wrong').toUpperCase()}
            </div>
          </div>
          <div className="border-l border-line pl-8">
            <div className="font-display text-3xl text-ink-soft">{summary.total}</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted">
              {t('total').toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-rad border border-line bg-card p-6 sm:p-8">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {tDetail('allAnswersEyebrow')}
        </div>
        <table className="mt-4 w-full font-mono text-sm tabular-nums">
          <thead>
            <tr className="border-b border-line text-[10px] uppercase tracking-widest text-muted">
              <th className="py-2 pr-4 text-left font-normal">{t('table.number')}</th>
              <th className="w-8 px-2 py-2 text-center font-normal" />
              <th className="px-3 py-2 text-left font-normal">{t('table.yourAnswer')}</th>
              <th className="py-2 pl-3 text-left font-normal">{t('table.correctAnswer')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([id, detail], i) => {
              const numericId = Number(id)
              const padded = Number.isFinite(numericId)
                ? String(numericId).padStart(2, '0')
                : String(i + 1).padStart(2, '0')
              return (
                <tr key={id} className="border-b border-line-soft last:border-b-0">
                  <td className="py-2 pr-4 text-muted">{padded}</td>
                  <td className="w-8 px-2 py-2 text-center">
                    {detail.isCorrect ? (
                      <span className="text-accent-ink">✓</span>
                    ) : (
                      <span className="text-error">✗</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-ink">{detail.userAnswer || '—'}</td>
                  <td className={`py-2 pl-3 ${detail.isCorrect ? 'text-muted' : 'text-ink-soft'}`}>
                    {detail.isCorrect ? '—' : detail.correctAnswer}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SchreibenDetails({
  feedback,
  t,
  tDetail,
}: {
  feedback: Record<string, unknown>
  t: T
  tDetail: T
}) {
  const criteria = feedback.criteria as
    | { taskFulfillment: number; coherence: number; vocabulary: number; grammar: number }
    | undefined
  const comment = feedback.comment as string | undefined
  if (!criteria) return null

  const rows: Array<[string, number, number]> = [
    [t('taskFulfillment'), criteria.taskFulfillment, 25],
    [t('coherence'), criteria.coherence, 25],
    [t('vocabulary'), criteria.vocabulary, 25],
    [t('grammar'), criteria.grammar, 25],
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-rad border border-line bg-card p-8">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {tDetail('criteriaEyebrow')}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {rows.map(([label, score, max]) => (
            <div key={label}>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {label}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-4xl text-ink">{score}</span>
                <span className="text-sm text-ink-soft">/ {max}</span>
              </div>
              <ProgressBar value={score} max={max} />
            </div>
          ))}
        </div>
      </div>

      {comment && (
        <div className="rounded-rad border border-line bg-card p-8">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {tDetail('aiFeedbackEyebrow')}
          </div>
          <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-ink">{comment}</p>
        </div>
      )}
    </div>
  )
}

function SprechenDetails({
  feedback,
  t,
  tDetail,
}: {
  feedback: Record<string, unknown>
  t: T
  tDetail: T
}) {
  const criteria = feedback.criteria as
    | {
        taskFulfillment: number
        fluency: number
        vocabulary: number
        grammar: number
        pronunciation: number
      }
    | undefined
  const comment = feedback.comment as string | undefined
  if (!criteria) return null

  const rows: Array<[string, number, number]> = [
    [t('taskFulfillment'), criteria.taskFulfillment, 20],
    [t('fluency'), criteria.fluency, 20],
    [t('vocabulary'), criteria.vocabulary, 20],
    [t('grammar'), criteria.grammar, 20],
    [t('pronunciation'), criteria.pronunciation, 20],
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-rad border border-line bg-card p-8">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {tDetail('criteriaEyebrow')}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3">
          {rows.map(([label, score, max]) => (
            <div key={label}>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {label}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-4xl text-ink">{score}</span>
                <span className="text-sm text-ink-soft">/ {max}</span>
              </div>
              <ProgressBar value={score} max={max} />
            </div>
          ))}
        </div>
      </div>

      {comment && (
        <div className="rounded-rad border border-line bg-card p-8">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {tDetail('aiFeedbackEyebrow')}
          </div>
          <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-ink">{comment}</p>
        </div>
      )}
    </div>
  )
}
