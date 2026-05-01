import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { createServerClient } from '@/lib/supabase-server'
import { CriteriaWithLetters } from '@/components/results/CriteriaWithLetters'
import { ScoreHero } from '@/components/results/shared/ScoreHero'
import { ReadingListeningAnswersTable } from '@/components/results/shared/ReadingListeningAnswersTable'
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

  const [tModules, tDetail, tCriteriaBlock, tUserInput, tSprechen, tPublic] = await Promise.all([
    getTranslations({ locale, namespace: 'modules' }),
    getTranslations({ locale, namespace: 'dashboard.testDetail' }),
    getTranslations({ locale, namespace: 'results.schreiben.criteriaBlock' }),
    getTranslations({ locale, namespace: 'results.userInput' }),
    getTranslations({ locale, namespace: 'results.sprechen' }),
    getTranslations({ locale, namespace: 'results.public' }),
  ])

  const moduleLabel = tModules(moduleKey)
  const messages = (await import(`@/messages/${locale}.json`)).default
  const fallbackMessages =
    locale === 'de'
      ? messages
      : (await import(`@/messages/de.json`)).default
  const mergedMessages = { ...fallbackMessages, ...messages }

  const fb = aiFeedback?.[moduleKey] as Record<string, unknown> | undefined
  const homeHref = locale === 'de' ? '/' : `/${locale}`

  return (
    <NextIntlClientProvider locale={locale} messages={mergedMessages}>
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
        <ScoreHero
          score={score}
          moduleLabel={moduleLabel}
          level={level}
          submittedAt={submittedAt}
        />

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
        {fb && (moduleKey === 'lesen' || moduleKey === 'horen') && (() => {
          const details = (fb as { details?: Record<string, { userAnswer: string; correctAnswer: string; isCorrect: boolean }> }).details
          const summary = (fb as { summary?: { correct: number; total: number; score: number } }).summary
          if (!details || !summary) return null
          return (
            <ReadingListeningAnswersTable details={details} summary={summary} />
          )
        })()}
        {fb && moduleKey === 'schreiben' && (() => {
          const criteria = (fb as { criteria?: Record<string, number> }).criteria
          const comment = (fb as { comment?: string }).comment
          if (!criteria) return null
          return (
            <div className="space-y-6">
              <CriteriaWithLetters
                scores={{
                  taskFulfillment: criteria.taskFulfillment ?? 0,
                  coherence:       criteria.coherence ?? 0,
                  vocabulary:      criteria.vocabulary ?? 0,
                  grammar:         criteria.grammar ?? 0,
                }}
                title={tCriteriaBlock('title')}
                translatedTitle={tCriteriaBlock('translatedTitle')}
                helper={tCriteriaBlock('helper')}
                labels={{
                  de: {
                    taskFulfillment: tCriteriaBlock('criteria.taskFulfillment'),
                    coherence:       tCriteriaBlock('criteria.coherence'),
                    vocabulary:      tCriteriaBlock('criteria.vocabulary'),
                    grammar:         tCriteriaBlock('criteria.grammar'),
                  },
                  translated: {
                    taskFulfillment: tCriteriaBlock('translatedCriteria.taskFulfillment'),
                    coherence:       tCriteriaBlock('translatedCriteria.coherence'),
                    vocabulary:      tCriteriaBlock('translatedCriteria.vocabulary'),
                    grammar:         tCriteriaBlock('translatedCriteria.grammar'),
                  },
                }}
              />
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
        })()}
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
    </NextIntlClientProvider>
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
