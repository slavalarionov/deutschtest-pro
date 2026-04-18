'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/routing'
import type { ExamLevel, ExamModule } from '@/types/exam'

type LevelKey = 'a1' | 'a2' | 'b1'

const LEVELS: { value: ExamLevel; label: string; descKey: LevelKey }[] = [
  { value: 'A1', label: 'A1', descKey: 'a1' },
  { value: 'A2', label: 'A2', descKey: 'a2' },
  { value: 'B1', label: 'B1', descKey: 'b1' },
]

const MODULE_OPTIONS: {
  id: ExamModule
  icon: string
}[] = [
  { id: 'lesen', icon: '📖' },
  { id: 'horen', icon: '🎧' },
  { id: 'schreiben', icon: '✍️' },
  { id: 'sprechen', icon: '🗣' },
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
  defaultLevel = 'B1',
}: ModuleLauncherProps) {
  const router = useRouter()
  const t = useTranslations('dashboard.launcher')
  const [selectedLevel, setSelectedLevel] = useState<ExamLevel>(defaultLevel)
  const [selectedModule, setSelectedModule] = useState<ExamModule | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasCredits = isAdmin || modulesBalance > 0

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

  return (
    <div className="rounded-2xl bg-brand-white p-6 shadow-soft sm:p-8">
      <h2 className="mb-1 text-lg font-semibold text-brand-text">
        {t('title')}
      </h2>
      <p className="mb-6 text-sm text-brand-muted">{t('subtitle')}</p>

      <div className="mb-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-brand-muted">
          {t('levelLabel')}
        </p>
        <div className="flex gap-3">
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
                className={`block text-base font-bold ${
                  selectedLevel === lvl.value
                    ? 'text-brand-gold-dark'
                    : 'text-brand-text'
                }`}
              >
                {lvl.label}
              </span>
              <span className="block text-[11px] text-brand-muted">
                {t(`levels.${lvl.descKey}`)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-brand-muted">
          {t('moduleLabel')}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                <span className="text-lg">{mod.icon}</span>
                <div className="flex-1">
                  <span className="font-semibold text-brand-text">
                    {t(`modules.${mod.id}`)}
                  </span>
                  <span className="mt-0.5 block text-xs text-brand-muted">
                    {t(`durations.${mod.id}`)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        {hasCredits ? (
          <button
            type="button"
            onClick={handleStart}
            disabled={loading || !selectedModule}
            className="rounded-lg bg-brand-gold px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-gold-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t('generating')}
              </span>
            ) : selectedModule ? (
              t('startButton', { level: selectedLevel })
            ) : (
              t('chooseModule')
            )}
          </button>
        ) : (
          <Link
            href="/pricing"
            className="rounded-lg bg-brand-gold px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-gold-dark"
          >
            {t('buyModules')}
          </Link>
        )}

        <p className="text-xs text-brand-muted">
          {isAdmin
            ? t('adminUnlimited')
            : t('creditsAvailable', { count: modulesBalance })}
        </p>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-brand-red/5 px-3 py-2 text-sm text-brand-red">
          {error}
        </p>
      )}
    </div>
  )
}
