'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import type { ExamLevel, ExamModule } from '@/types/exam'

const LEVELS: ExamLevel[] = ['A1', 'A2', 'B1']
const MODULES: { id: ExamModule; icon: string }[] = [
  { id: 'lesen', icon: '📖' },
  { id: 'horen', icon: '🎧' },
  { id: 'schreiben', icon: '✍️' },
  { id: 'sprechen', icon: '🗣' },
]

interface HeroSectionProps {
  isLoggedIn: boolean
  freeTestAvailable?: boolean
  paidTestsCount?: number
  modulesBalance?: number
  isAdmin?: boolean
}

export function HeroSection({
  isLoggedIn,
  freeTestAvailable = true,
  paidTestsCount = 0,
  modulesBalance = 0,
  isAdmin = false,
}: HeroSectionProps) {
  const router = useRouter()
  const t = useTranslations('landing.hero')
  const [selectedLevel, setSelectedLevel] = useState<ExamLevel>('B1')
  const [selectedModule, setSelectedModule] = useState<ExamModule | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** API `error` string for dev-only under the German message (screenshots / debugging). */
  const [errorDetail, setErrorDetail] = useState<string | null>(null)

  const genericGenerateFail = t('errors.generateFailed')

  async function handleStartExam() {
    if (!isLoggedIn) {
      router.push('/register')
      return
    }

    if (!selectedModule) return

    const mustPrepayModules =
      !isAdmin && !freeTestAvailable && paidTestsCount === 0

    if (mustPrepayModules && modulesBalance < 1) {
      setError(t('errors.noCredits'))
      return
    }

    setLoading(true)
    setError(null)
    setErrorDetail(null)

    try {
      const res = await fetch('/api/exam/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: selectedLevel, module: selectedModule }),
      })

      let data: Record<string, unknown> = {}
      try {
        data = (await res.json()) as Record<string, unknown>
      } catch {
        data = {}
      }

      if (res.status === 401) {
        setLoading(false)
        router.push('/login')
        return
      }

      if (res.status === 403) {
        setLoading(false)
        if (data.code === 'insufficient_balance') {
          setError(String(data.error ?? t('errors.insufficientBalanceFallback')))
        } else {
          router.push(String(data.redirect ?? '/pricing'))
        }
        return
      }

      if (!res.ok) {
        const code = data.code
        const apiError = typeof data.error === 'string' ? data.error : undefined
        console.error('[exam/generate] non-OK response', { status: res.status, code, error: apiError })
        setError(genericGenerateFail)
        setErrorDetail(apiError ?? null)
        setLoading(false)
        return
      }

      if (!data.success || !data.sessionId) {
        const code = data.code
        const apiError = typeof data.error === 'string' ? data.error : undefined
        console.error('[exam/generate] unexpected body', { code, error: apiError, success: data.success })
        setError(genericGenerateFail)
        setErrorDetail(apiError ?? null)
        setLoading(false)
        return
      }

      router.push(`/exam/${data.sessionId}`)
      setLoading(false)
    } catch (err) {
      console.error('[exam/generate] fetch failed', err)
      setError(genericGenerateFail)
      setErrorDetail(err instanceof Error ? err.message : String(err))
      setLoading(false)
    }
  }

  function getCtaLabel(): string {
    if (loading) return ''
    if (!isLoggedIn) return t('ctaRegister')
    if (!selectedModule) return t('ctaSelectModule')
    if (freeTestAvailable || paidTestsCount > 0 || modulesBalance > 0) {
      return t('ctaStart', { level: selectedLevel })
    }
    return t('ctaBuy')
  }

  function getSubtitle(): string {
    if (!isLoggedIn) return t('subtitleGuest')
    if (freeTestAvailable) return t('subtitleFreeAvailable')
    if (paidTestsCount > 0) return t('subtitlePaidTests', { count: paidTestsCount })
    if (modulesBalance > 0) return t('subtitleModules', { count: modulesBalance })
    return ''
  }

  const showExamSelector =
    isLoggedIn && (freeTestAvailable || paidTestsCount > 0 || modulesBalance > 0 || isAdmin)
  const showBuyButton =
    isLoggedIn && !isAdmin && !freeTestAvailable && paidTestsCount === 0 && modulesBalance === 0

  const loadingHint = loading ? t('loadingHint') : null
  const levelDescKey: Record<ExamLevel, string> = {
    A1: 'a1',
    A2: 'a2',
    B1: 'b1',
  }

  return (
    <section className="relative overflow-hidden bg-brand-bg px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="mb-4 inline-block rounded-full bg-brand-surface px-4 py-1.5 text-xs font-medium tracking-wide text-brand-muted">
            {t('badge')}
          </span>

          <h1 className="mb-6 text-4xl font-bold leading-tight text-brand-text sm:text-5xl lg:text-6xl">
            {t('titlePart1')}{' '}
            <span className="text-brand-gold">{t('titleHighlight')}</span>{' '}
            {t('titlePart2')}
          </h1>

          <p className="mx-auto mb-4 max-w-2xl text-lg text-brand-muted">
            {t('subtitle')}
          </p>

          {getSubtitle() && (
            <p className="mx-auto mb-8 max-w-xl text-sm font-medium text-brand-gold-dark">
              {getSubtitle()}
            </p>
          )}

          {showExamSelector && (
            <>
              <div className="mx-auto mb-4 flex max-w-sm justify-center gap-3">
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSelectedLevel(lvl)}
                    disabled={loading}
                    className={`flex-1 rounded-xl border-2 px-4 py-3 transition ${
                      selectedLevel === lvl
                        ? 'border-brand-gold bg-brand-gold/5 shadow-soft'
                        : 'border-brand-border bg-brand-white hover:border-brand-gold/40'
                    }`}
                  >
                    <span
                      className={`block text-lg font-bold ${selectedLevel === lvl ? 'text-brand-gold-dark' : 'text-brand-text'}`}
                    >
                      {lvl}
                    </span>
                    <span className="block text-[11px] text-brand-muted">
                      {t(`levels.${levelDescKey[lvl]}`)}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mx-auto mb-4 grid max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
                {MODULES.map((mod) => {
                  const checked = selectedModule === mod.id
                  const nameKey = `modules.${mod.id}` as const
                  const durKey =
                    `modules.duration${mod.id.charAt(0).toUpperCase()}${mod.id.slice(1)}` as const
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setSelectedModule(mod.id)}
                      disabled={loading}
                      className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${
                        checked
                          ? 'border-brand-gold bg-brand-gold/5 shadow-soft'
                          : 'border-brand-border bg-brand-white hover:border-brand-gold/40'
                      }`}
                    >
                      <div className="flex-1">
                        <span className="text-lg">{mod.icon}</span>{' '}
                        <span className="font-semibold text-brand-text">{t(nameKey)}</span>
                        <span className="mt-0.5 block text-xs text-brand-muted">{t(durKey)}</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <p className="mx-auto mb-6 max-w-xl text-sm text-brand-muted">
                {t('modulesHint')}
              </p>
            </>
          )}

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            {showBuyButton ? (
              <div className="flex flex-col items-center gap-3">
                <p className="max-w-md text-sm text-brand-muted">
                  {t('buyPrompt')}
                </p>
                <Link
                  href="/pricing"
                  className="rounded-lg bg-brand-gold px-8 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-gold-dark"
                >
                  {t('ctaBuy')}
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartExam}
                disabled={loading || (isLoggedIn && !selectedModule)}
                className="rounded-lg bg-brand-gold px-8 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-gold-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t('ctaGenerating')}
                  </span>
                ) : (
                  getCtaLabel()
                )}
              </button>
            )}
          </div>

          {error && (
            <div className="mt-4">
              <p className="text-sm text-brand-red">{error}</p>
              {process.env.NODE_ENV !== 'production' && errorDetail && (
                <p className="mt-1 break-all font-mono text-xs text-brand-red/80">{errorDetail}</p>
              )}
            </div>
          )}

          {loadingHint && <p className="mt-3 text-xs text-brand-muted">{loadingHint}</p>}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 flex items-center justify-center gap-8 text-sm text-brand-muted"
        >
          <div>
            <span className="block text-2xl font-bold text-brand-text">A1–B1</span>
            {t('stats.levels')}
          </div>
          <div className="h-8 w-px bg-brand-border" />
          <div>
            <span className="block text-2xl font-bold text-brand-text">4</span>
            {t('stats.modules')}
          </div>
          <div className="h-8 w-px bg-brand-border" />
          <div>
            <span className="block text-2xl font-bold text-brand-text">{t('stats.aiLabel')}</span>
            {t('stats.ai')}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
