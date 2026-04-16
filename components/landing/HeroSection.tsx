'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import type { ExamLevel, ExamModule } from '@/types/exam'

const LEVELS: { value: ExamLevel; label: string; desc: string }[] = [
  { value: 'A1', label: 'A1', desc: 'Start Deutsch 1' },
  { value: 'A2', label: 'A2', desc: 'Goethe-Zertifikat A2' },
  { value: 'B1', label: 'B1', desc: 'Goethe-Zertifikat B1' },
]

const MODULE_OPTIONS: {
  id: ExamModule
  name: string
  duration: string
  icon: string
}[] = [
  { id: 'lesen', name: 'Lesen', duration: '65 Min', icon: '📖' },
  { id: 'horen', name: 'Hören', duration: '40 Min', icon: '🎧' },
  { id: 'schreiben', name: 'Schreiben', duration: '60 Min', icon: '✍️' },
  { id: 'sprechen', name: 'Sprechen', duration: '15 Min', icon: '🗣' },
]

const GENERIC_GENERATE_FAIL =
  'Die Prüfung konnte nicht generiert werden. Bitte versuchen Sie es etwas später erneut.'

interface HeroSectionProps {
  isLoggedIn: boolean
  freeTestAvailable: boolean
  paidTestsCount: number
  modulesBalance: number
  isAdmin: boolean
}

export function HeroSection({
  isLoggedIn,
  freeTestAvailable,
  paidTestsCount,
  modulesBalance,
  isAdmin,
}: HeroSectionProps) {
  const router = useRouter()
  const [selectedLevel, setSelectedLevel] = useState<ExamLevel>('B1')
  const [selectedModule, setSelectedModule] = useState<ExamModule | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** API `error` string for dev-only under the German message (screenshots / debugging). */
  const [errorDetail, setErrorDetail] = useState<string | null>(null)

  async function handleStartExam() {
    if (!isLoggedIn) {
      router.push('/register')
      return
    }

    if (!selectedModule) return

    const mustPrepayModules =
      !isAdmin && !freeTestAvailable && paidTestsCount === 0

    if (mustPrepayModules && modulesBalance < 1) {
      setError(
        'Sie haben keine Modul-Credits mehr. Bitte kaufen Sie weitere Credits.'
      )
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
          setError(String(data.error ?? 'Nicht genug Modul-Credits.'))
        } else {
          router.push(String(data.redirect ?? '/pricing'))
        }
        return
      }

      if (!res.ok) {
        const code = data.code
        const apiError = typeof data.error === 'string' ? data.error : undefined
        console.error('[exam/generate] non-OK response', { status: res.status, code, error: apiError })
        setError(GENERIC_GENERATE_FAIL)
        setErrorDetail(apiError ?? null)
        setLoading(false)
        return
      }

      if (!data.success || !data.sessionId) {
        const code = data.code
        const apiError = typeof data.error === 'string' ? data.error : undefined
        console.error('[exam/generate] unexpected body', { code, error: apiError, success: data.success })
        setError(GENERIC_GENERATE_FAIL)
        setErrorDetail(apiError ?? null)
        setLoading(false)
        return
      }

      router.push(`/exam/${data.sessionId}`)
      setLoading(false)
    } catch (err) {
      console.error('[exam/generate] fetch failed', err)
      setError(GENERIC_GENERATE_FAIL)
      setErrorDetail(err instanceof Error ? err.message : String(err))
      setLoading(false)
    }
  }

  function getCtaLabel(): string {
    if (loading) return ''
    if (!isLoggedIn) return 'Kostenlos registrieren & testen'
    if (!selectedModule) return 'Modul wählen'
    if (freeTestAvailable || paidTestsCount > 0 || modulesBalance > 0) {
      return `Test starten — ${selectedLevel}`
    }
    return 'Tests kaufen'
  }

  function getSubtitle(): string {
    if (!isLoggedIn) return 'Registrieren Sie sich und erhalten Sie einen kostenlosen Test.'
    if (freeTestAvailable) return 'Ihr kostenloser Probetest wartet auf Sie.'
    if (paidTestsCount > 0) return `Sie haben ${paidTestsCount} ${paidTestsCount === 1 ? 'Test' : 'Tests'} verfügbar.`
    if (modulesBalance > 0) {
      return `Modul-Credits: ${modulesBalance} (1 Credit pro Modul)`
    }
    return ''
  }

  const showExamSelector =
    isLoggedIn && (freeTestAvailable || paidTestsCount > 0 || modulesBalance > 0 || isAdmin)
  const showBuyButton =
    isLoggedIn && !isAdmin && !freeTestAvailable && paidTestsCount === 0 && modulesBalance === 0

  const loadingHint =
    loading ? 'Modul wird generiert — bitte einen Moment warten…' : null

  return (
    <section className="relative overflow-hidden bg-brand-bg px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="mb-4 inline-block rounded-full bg-brand-surface px-4 py-1.5 text-xs font-medium tracking-wide text-brand-muted">
            KI-gestützte Prüfungsvorbereitung
          </span>

          <h1 className="mb-6 text-4xl font-bold leading-tight text-brand-text sm:text-5xl lg:text-6xl">
            Bestehen Sie das{' '}
            <span className="text-brand-gold">Goethe-Zertifikat</span>{' '}
            beim ersten Versuch
          </h1>

          <p className="mx-auto mb-4 max-w-2xl text-lg text-brand-muted">
            Realistische Prüfungssimulation mit KI-generierten Aufgaben,
            automatischer Bewertung und detailliertem Feedback.
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
                    key={lvl.value}
                    type="button"
                    onClick={() => setSelectedLevel(lvl.value)}
                    disabled={loading}
                    className={`flex-1 rounded-xl border-2 px-4 py-3 transition ${
                      selectedLevel === lvl.value
                        ? 'border-brand-gold bg-brand-gold/5 shadow-soft'
                        : 'border-brand-border bg-brand-white hover:border-brand-gold/40'
                    }`}
                  >
                    <span
                      className={`block text-lg font-bold ${selectedLevel === lvl.value ? 'text-brand-gold-dark' : 'text-brand-text'}`}
                    >
                      {lvl.label}
                    </span>
                    <span className="block text-[11px] text-brand-muted">{lvl.desc}</span>
                  </button>
                ))}
              </div>

              <div className="mx-auto mb-4 grid max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
                {MODULE_OPTIONS.map((mod) => {
                  const checked = selectedModule === mod.id
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
                        <span className="font-semibold text-brand-text">{mod.name}</span>
                        <span className="mt-0.5 block text-xs text-brand-muted">{mod.duration}</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <p className="mx-auto mb-6 max-w-xl text-sm text-brand-muted">
                💡 Wählen Sie ein Modul für ein gezieltes Training. 1 Credit = 1 Modul.
              </p>
            </>
          )}

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            {showBuyButton ? (
              <div className="flex flex-col items-center gap-3">
                <p className="max-w-md text-sm text-brand-muted">
                  Sie haben bereits Ihren kostenlosen Test verwendet. Kaufen Sie weitere Tests, um fortzufahren.
                </p>
                <Link
                  href="/pricing"
                  className="rounded-lg bg-brand-gold px-8 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-gold-dark"
                >
                  Tests kaufen
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
                    KI generiert Prüfung…
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
            Niveaustufen
          </div>
          <div className="h-8 w-px bg-brand-border" />
          <div>
            <span className="block text-2xl font-bold text-brand-text">4</span>
            Module
          </div>
          <div className="h-8 w-px bg-brand-border" />
          <div>
            <span className="block text-2xl font-bold text-brand-text">KI</span>
            Bewertung
          </div>
        </motion.div>
      </div>
    </section>
  )
}
