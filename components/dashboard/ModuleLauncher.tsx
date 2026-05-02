'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/routing'
import { ModuleIcon } from '@/components/dashboard/ModuleIcon'
import type { ExamLevel, ExamModule } from '@/types/exam'

type LevelKey = 'a1' | 'a2' | 'b1'

const LEVELS: { value: ExamLevel; label: string; descKey: LevelKey }[] = [
  { value: 'A1', label: 'A1', descKey: 'a1' },
  { value: 'A2', label: 'A2', descKey: 'a2' },
  { value: 'B1', label: 'B1', descKey: 'b1' },
]

const MODULE_OPTIONS: { id: ExamModule }[] = [
  { id: 'lesen' },
  { id: 'horen' },
  { id: 'schreiben' },
  { id: 'sprechen' },
]

interface ModuleLauncherProps {
  /** Prepaid credits available. When 0 we show a «Module kaufen» CTA instead of «Starten». */
  modulesBalance: number
  /** Admins bypass the balance check entirely. */
  isAdmin?: boolean
  defaultLevel?: ExamLevel
}

export function ModuleLauncher({
  modulesBalance,
  isAdmin = false,
  defaultLevel = 'A1',
}: ModuleLauncherProps) {
  const router = useRouter()
  const t = useTranslations('dashboard.launcher')
  const [selectedLevel, setSelectedLevel] = useState<ExamLevel>(defaultLevel)
  const [selectedModule, setSelectedModule] = useState<ExamModule | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasCredits = isAdmin || modulesBalance > 0
  const insufficient = error !== null && error === t('insufficientBalance')

  async function handleStart() {
    if (!selectedModule) return

    if (!hasCredits) {
      router.push('/pricing')
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

      let data: Record<string, unknown> = {}
      try {
        data = (await res.json()) as Record<string, unknown>
      } catch {
        data = {}
      }

      if (res.status === 401) {
        router.push('/login?next=/dashboard')
        return
      }

      if (res.status === 403) {
        if (data.code === 'insufficient_balance') {
          setError(String(data.error ?? t('insufficientBalance')))
        } else {
          router.push(String(data.redirect ?? '/pricing'))
        }
        setLoading(false)
        return
      }

      if (!res.ok || !data.success || !data.sessionId) {
        setError(t('generateFailed'))
        setLoading(false)
        return
      }

      router.push(`/exam/${data.sessionId}`)
    } catch {
      setError(t('generateFailed'))
      setLoading(false)
    }
  }

  const moduleLabel = selectedModule ? t(`modules.${selectedModule}`) : ''

  return (
    <div className="rounded-rad border border-line bg-card p-6 sm:p-8">
      {/* ===== Header ===== */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {t('eyebrow')}
        </div>
        <h3 className="mt-2 font-display text-3xl tracking-[-0.03em] text-ink md:text-4xl">
          {t('headline')}
        </h3>
      </div>

      {/* ===== Level selector ===== */}
      <div className="mt-8">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          {t('levelLabel')}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {LEVELS.map((lvl) => {
            const active = selectedLevel === lvl.value
            return (
              <button
                key={lvl.value}
                type="button"
                data-testid={`level-${lvl.descKey}`}
                onClick={() => setSelectedLevel(lvl.value)}
                disabled={loading}
                className={`rounded-rad-sm border p-4 text-left transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                  active
                    ? 'border-accent/60 bg-accent-soft text-ink'
                    : 'border-line bg-page text-ink hover:border-ink-soft'
                }`}
              >
                <div
                  className={`font-mono text-[10px] uppercase tracking-widest ${
                    active ? 'text-ink-soft' : 'text-muted'
                  }`}
                >
                  {lvl.label}
                </div>
                <div className="mt-2 font-display text-base tracking-[-0.01em]">
                  {t(`levels.${lvl.descKey}`)}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ===== Module selector ===== */}
      <div className="mt-6">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          {t('moduleLabel')}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {MODULE_OPTIONS.map((mod) => {
            const active = selectedModule === mod.id
            return (
              <button
                key={mod.id}
                type="button"
                data-testid={`module-${mod.id}`}
                onClick={() => setSelectedModule(mod.id)}
                disabled={loading}
                className={`flex flex-col items-start gap-3 rounded-rad-sm border p-5 text-left transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                  active
                    ? 'border-accent/60 bg-accent-soft text-ink'
                    : 'border-line bg-page text-ink hover:border-ink-soft'
                }`}
              >
                <ModuleIcon
                  module={mod.id}
                  className="h-6 w-6 text-ink"
                />
                <div
                  className={`font-mono text-[10px] uppercase tracking-widest ${
                    active ? 'text-ink-soft' : 'text-muted'
                  }`}
                >
                  {t(`durations.${mod.id}`)}
                </div>
                <div className="font-display text-xl tracking-[-0.02em]">
                  {t(`modules.${mod.id}`)}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ===== Error state ===== */}
      {error && (
        <div className="mt-6 rounded-rad-sm border border-line bg-surface p-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {t('errorEyebrow')}
          </div>
          <p className="mt-2 text-sm text-ink-soft">{error}</p>
          {insufficient && (
            <p className="mt-2 text-sm text-ink-soft">
              {t('insufficientHint')}{' '}
              <Link
                href="/pricing"
                className="underline underline-offset-4 transition-colors hover:text-ink"
              >
                {t('shopLink')}
              </Link>
              .
            </p>
          )}
        </div>
      )}

      {/* ===== Footer ===== */}
      <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {isAdmin
            ? t('adminUnlimitedMono')
            : t('balanceVerbose', { count: modulesBalance })}
        </div>

        {hasCredits ? (
          <button
            type="button"
            data-testid="launch-exam-start"
            onClick={handleStart}
            disabled={loading || !selectedModule}
            className="inline-flex items-center gap-2 rounded-rad-pill bg-ink px-6 py-3 text-sm font-medium text-page transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin"
                >
                  <path d="M12 3a9 9 0 0 1 9 9" />
                  <path d="M12 21a9 9 0 0 1-9-9" opacity="0.35" />
                </svg>
                <span>{t('generating')}</span>
              </>
            ) : selectedModule ? (
              <span>
                {t('startButton', { level: selectedLevel })} {moduleLabel}
              </span>
            ) : (
              <span>{t('chooseModuleDisabled')}</span>
            )}
          </button>
        ) : (
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-rad-pill bg-ink px-6 py-3 text-sm font-medium text-page transition-colors hover:bg-ink/90"
          >
            {t('buyModules')}
          </Link>
        )}
      </div>
    </div>
  )
}
