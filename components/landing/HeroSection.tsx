'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import type { ExamLevel, ExamModule } from '@/types/exam'
import { FULL_TEST_MODULE_ORDER } from '@/lib/exam/full-test-constants'

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

const MINUTES: Record<string, number> = {
  lesen: 65,
  horen: 40,
  schreiben: 60,
  sprechen: 15,
}

function calculateTotalTimeLabel(moduleIds: string[]): string {
  const totalMinutes = moduleIds.reduce((sum, m) => sum + (MINUTES[m] ?? 0), 0)
  if (totalMinutes <= 0) return '—'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}h ${minutes}min`
  return `${minutes}min`
}

function sortSelectedModules(ids: string[]): ExamModule[] {
  return FULL_TEST_MODULE_ORDER.filter((m) => ids.includes(m))
}

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
  const [selectedModules, setSelectedModules] = useState<ExamModule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const orderedSelection = useMemo(() => sortSelectedModules(selectedModules), [selectedModules])

  function toggleModule(id: ExamModule) {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  async function handleStartExam() {
    if (!isLoggedIn) {
      router.push('/register')
      return
    }

    if (orderedSelection.length === 0) return

    const mustPrepayModules =
      !isAdmin && !freeTestAvailable && paidTestsCount === 0

    if (mustPrepayModules && modulesBalance < orderedSelection.length) {
      setError(
        `Sie haben nur ${modulesBalance} Modul-Credit${modulesBalance === 1 ? '' : 's'} — für diese Auswahl benötigen Sie ${orderedSelection.length}. Bitte kaufen Sie weitere Credits.`
      )
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/exam/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: selectedLevel, modules: orderedSelection }),
      })

      const data = await res.json()

      if (res.status === 401) {
        setLoading(false)
        router.push('/login')
        return
      }

      if (res.status === 403) {
        setLoading(false)
        if (data.code === 'insufficient_balance') {
          setError(data.error || 'Nicht genug Modul-Credits.')
        } else {
          router.push(data.redirect || '/pricing')
        }
        return
      }

      if (!data.success || !data.sessionId) {
        throw new Error(data.error || 'Generation failed')
      }

      const first = data.firstModule as string
      const multi = orderedSelection.length > 1
      if (multi) {
        router.push(`/exam/${data.sessionId}?module=${first}&fresh=1`)
      } else {
        router.push(`/exam/${data.sessionId}`)
      }
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(false)
    }
  }

  function getCtaLabel(): string {
    if (loading) return ''
    if (!isLoggedIn) return 'Kostenlos registrieren & testen'
    if (orderedSelection.length === 0) return 'Mind. ein Modul wählen'
    if (freeTestAvailable) {
      return `Test starten — ${selectedLevel} (${orderedSelection.length} ${orderedSelection.length === 1 ? 'Modul' : 'Module'})`
    }
    if (paidTestsCount > 0) {
      return `Test starten — ${selectedLevel} (${orderedSelection.length} ${orderedSelection.length === 1 ? 'Modul' : 'Module'})`
    }
    if (modulesBalance > 0) {
      return `Test starten — ${selectedLevel} (${orderedSelection.length} ${orderedSelection.length === 1 ? 'Modul' : 'Module'})`
    }
    return 'Tests kaufen'
  }

  function getSubtitle(): string {
    if (!isLoggedIn) return 'Registrieren Sie sich und erhalten Sie einen kostenlosen Test.'
    if (freeTestAvailable) return 'Ihr kostenloser Probetest wartet auf Sie.'
    if (paidTestsCount > 0) return `Sie haben ${paidTestsCount} ${paidTestsCount === 1 ? 'Test' : 'Tests'} verfügbar.`
    if (modulesBalance > 0) {
      return `Modul-Credits: ${modulesBalance} (je Modul 1 Credit beim Abschluss)`
    }
    return ''
  }

  const showExamSelector =
    isLoggedIn && (freeTestAvailable || paidTestsCount > 0 || modulesBalance > 0 || isAdmin)
  const showBuyButton =
    isLoggedIn && !isAdmin && !freeTestAvailable && paidTestsCount === 0 && modulesBalance === 0

  const loadingHint =
    loading ? 'Erstes Modul wird generiert — bitte einen Moment warten…' : null

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
                  const checked = selectedModules.includes(mod.id)
                  return (
                    <label
                      key={mod.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${
                        checked
                          ? 'border-brand-gold bg-brand-gold/5 shadow-soft'
                          : 'border-brand-border bg-brand-white hover:border-brand-gold/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleModule(mod.id)}
                        disabled={loading}
                        className="h-4 w-4 rounded border-brand-border text-brand-gold focus:ring-brand-gold"
                      />
                      <div className="flex-1">
                        <span className="text-lg">{mod.icon}</span>{' '}
                        <span className="font-semibold text-brand-text">{mod.name}</span>
                        <span className="mt-0.5 block text-xs text-brand-muted">{mod.duration}</span>
                      </div>
                    </label>
                  )
                })}
              </div>

              <p className="mx-auto mb-4 max-w-xl text-sm text-brand-muted">
                💡 Das vollständige Goethe-Zertifikat umfasst alle 4 Module. Sie können 1–4 Module
                für gezieltes Training auswählen.
              </p>

              {orderedSelection.length > 0 && (
                <div className="mx-auto mb-6 max-w-md rounded-xl bg-brand-surface/80 px-4 py-3 text-sm text-brand-text">
                  <p>
                    Gewählt: <strong>{orderedSelection.length}</strong> von 4 Modulen
                  </p>
                  <p className="text-brand-muted">
                    Ungefähre Dauer: <strong>~{calculateTotalTimeLabel(orderedSelection)}</strong>
                  </p>
                </div>
              )}
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
                disabled={loading || (isLoggedIn && orderedSelection.length === 0)}
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

          {error && <p className="mt-4 text-sm text-brand-red">{error}</p>}

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
