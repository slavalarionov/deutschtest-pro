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
      <div className="flex min-h-screen items-center justify-center bg-brand-bg">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-brand-gold border-t-transparent" />
          <p className="text-sm text-brand-muted">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg">
        <div className="rounded-xl bg-brand-white p-8 text-center shadow-card">
          <p className="mb-4 text-brand-red">{error || t('notFound')}</p>
          <a
            href="/"
            className="rounded-lg bg-brand-gold px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-gold-dark"
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
    <div className="min-h-screen bg-brand-bg">
      <header className="sticky top-0 z-50 border-b border-brand-border bg-brand-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm font-bold text-brand-gold">
              DeutschTest.pro
            </a>
            <span className="text-brand-border">|</span>
            <span className="text-sm font-semibold text-brand-text">
              {t('certificate', { level: session.level })}
            </span>
            <span className="rounded-full bg-brand-surface px-2.5 py-0.5 text-xs font-medium text-brand-muted">
              {moduleLabel}
            </span>
          </div>
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
