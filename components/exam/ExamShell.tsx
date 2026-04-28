'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useExamStore } from '@/store/examStore'
import { LesenModule } from '@/components/modules/LesenModule'
import { SchreibenModule } from '@/components/modules/SchreibenModule'
import { HorenModule } from '@/components/modules/HorenModule'
import { SprechenModule } from '@/components/modules/SprechenModule'

interface ExamShellProps {
  sessionId: string
}

type ExamModuleId = 'lesen' | 'horen' | 'schreiben' | 'sprechen'

const VALID_MODULES = new Set<ExamModuleId>([
  'lesen',
  'horen',
  'schreiben',
  'sprechen',
])

export function ExamShell({ sessionId }: ExamShellProps) {
  const t = useTranslations('exam.shell')
  const tModules = useTranslations('modules')
  const { session, setSession } = useExamStore()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function loadSession() {
      try {
        const res = await fetch(`/api/exam/${sessionId}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to load exam')
        }
        const data = await res.json()
        if (!alive) return
        setSession(data.session)
      } catch (err) {
        if (!alive) return
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (alive) setLoading(false)
      }
    }
    loadSession()
    return () => {
      alive = false
    }
  }, [sessionId, setSession])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-rad-pill border-2 border-line border-t-ink" />
          <p className="font-mono text-xs uppercase tracking-wider text-muted">
            {t('loading')}
          </p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page p-4">
        <div className="w-full max-w-md rounded-rad border border-line bg-card p-8 text-center">
          <p className="mb-6 text-sm text-error">{error || t('notFound')}</p>
          <a
            href="/"
            className="inline-flex items-center rounded-rad-pill bg-ink px-6 py-3 text-sm font-medium text-page transition-colors hover:bg-ink/90"
          >
            {t('back')}
          </a>
        </div>
      </div>
    )
  }

  const activeModule: ExamModuleId = VALID_MODULES.has(
    session.mode as ExamModuleId
  )
    ? (session.mode as ExamModuleId)
    : 'lesen'
  const moduleLabel = tModules(activeModule)

  return (
    <div data-testid="exam-shell" className="min-h-screen bg-page">
      <header className="sticky top-0 z-50 border-b border-line bg-card/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="inline-flex items-center gap-2"
              aria-label="DeutschTest.pro"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon-mark.svg"
                alt=""
                width={20}
                height={20}
                aria-hidden="true"
              />
              <span className="font-display text-sm font-medium tracking-tight text-ink">
                deutschtest<span className="text-muted">.pro</span>
              </span>
            </a>
            <span aria-hidden="true" className="h-4 w-px bg-line" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
              {t('certificate', { level: session.level })}
            </span>
          </div>
          <span className="inline-flex items-center gap-2 rounded-rad-pill border border-line bg-card px-3 py-1 text-xs font-medium text-ink">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-rad-pill bg-accent"
            />
            {moduleLabel}
          </span>
        </div>
      </header>
      <div className="px-4 py-8">
        {activeModule === 'lesen' && <LesenModule />}
        {activeModule === 'horen' && <HorenModule />}
        {activeModule === 'schreiben' && <SchreibenModule />}
        {activeModule === 'sprechen' && <SprechenModule />}
      </div>
    </div>
  )
}
