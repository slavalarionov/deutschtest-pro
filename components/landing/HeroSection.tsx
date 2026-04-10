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

const MODULES: { value: ExamModule; label: string; icon: string; ready: boolean }[] = [
  { value: 'lesen', label: 'Lesen', icon: '📖', ready: true },
  { value: 'schreiben', label: 'Schreiben', icon: '✍️', ready: true },
  { value: 'horen', label: 'Hören', icon: '🎧', ready: true },
  { value: 'sprechen', label: 'Sprechen', icon: '🗣', ready: true },
]

interface HeroSectionProps {
  isLoggedIn: boolean
  freeTestAvailable: boolean
  paidTestsCount: number
}

export function HeroSection({ isLoggedIn, freeTestAvailable, paidTestsCount }: HeroSectionProps) {
  const router = useRouter()
  const [selectedLevel, setSelectedLevel] = useState<ExamLevel>('B1')
  const [selectedModule, setSelectedModule] = useState<ExamModule>('lesen')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStartExam() {
    if (!isLoggedIn) {
      router.push('/register')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/exam/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: selectedLevel, module: selectedModule }),
      })

      const data = await res.json()

      if (res.status === 401) {
        router.push('/login')
        return
      }

      if (res.status === 403) {
        router.push('/pricing')
        return
      }

      if (!data.success || !data.sessionId) {
        throw new Error(data.error || 'Generation failed')
      }

      router.push(`/exam/${data.sessionId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(false)
    }
  }

  const activeModule = MODULES.find((m) => m.value === selectedModule)

  function getCtaLabel(): string {
    if (loading) return ''
    if (!isLoggedIn) return 'Kostenlos registrieren & testen'
    if (freeTestAvailable) return `Ihr kostenloser Test — ${selectedLevel} ${activeModule?.label}`
    if (paidTestsCount > 0) return `${selectedLevel} ${activeModule?.label} — Test starten`
    return 'Tests kaufen'
  }

  function getSubtitle(): string {
    if (!isLoggedIn) return 'Registrieren Sie sich und erhalten Sie einen kostenlosen Test.'
    if (freeTestAvailable) return 'Ihr kostenloser Probetest wartet auf Sie.'
    if (paidTestsCount > 0) return `Sie haben ${paidTestsCount} ${paidTestsCount === 1 ? 'Test' : 'Tests'} verfügbar.`
    return ''
  }

  const showExamSelector = isLoggedIn && (freeTestAvailable || paidTestsCount > 0)
  const showBuyButton = isLoggedIn && !freeTestAvailable && paidTestsCount === 0

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
              {/* Level selector */}
              <div className="mx-auto mb-4 flex max-w-sm justify-center gap-3">
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl.value}
                    onClick={() => setSelectedLevel(lvl.value)}
                    disabled={loading}
                    className={`flex-1 rounded-xl border-2 px-4 py-3 transition ${
                      selectedLevel === lvl.value
                        ? 'border-brand-gold bg-brand-gold/5 shadow-soft'
                        : 'border-brand-border bg-brand-white hover:border-brand-gold/40'
                    }`}
                  >
                    <span className={`block text-lg font-bold ${selectedLevel === lvl.value ? 'text-brand-gold-dark' : 'text-brand-text'}`}>
                      {lvl.label}
                    </span>
                    <span className="block text-[11px] text-brand-muted">{lvl.desc}</span>
                  </button>
                ))}
              </div>

              {/* Module selector */}
              <div className="mx-auto mb-6 flex max-w-md justify-center gap-2">
                {MODULES.map((mod) => (
                  <button
                    key={mod.value}
                    onClick={() => mod.ready && setSelectedModule(mod.value)}
                    disabled={loading || !mod.ready}
                    className={`flex-1 rounded-lg border px-3 py-2.5 transition ${
                      selectedModule === mod.value
                        ? 'border-brand-gold bg-brand-gold/5'
                        : mod.ready
                          ? 'border-brand-border bg-brand-white hover:border-brand-gold/40'
                          : 'cursor-not-allowed border-brand-border bg-brand-surface/50 opacity-50'
                    }`}
                  >
                    <span className="block text-base">{mod.icon}</span>
                    <span className={`block text-xs font-semibold ${selectedModule === mod.value ? 'text-brand-gold-dark' : 'text-brand-text'}`}>
                      {mod.label}
                    </span>
                    {!mod.ready && <span className="block text-[9px] text-brand-muted">bald</span>}
                  </button>
                ))}
              </div>
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
                onClick={handleStartExam}
                disabled={loading}
                className="rounded-lg bg-brand-gold px-8 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-gold-dark disabled:opacity-70"
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
            <p className="mt-4 text-sm text-brand-red">{error}</p>
          )}

          {loading && selectedModule === 'lesen' && (
            <p className="mt-3 text-xs text-brand-muted">
              5 Teile werden parallel generiert — ca. 60 Sekunden…
            </p>
          )}
          {loading && selectedModule === 'horen' && (
            <p className="mt-3 text-xs text-brand-muted">
              4 Teile werden parallel generiert — ca. 45 Sekunden…
            </p>
          )}
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
