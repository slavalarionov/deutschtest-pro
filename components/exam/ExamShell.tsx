'use client'

import { useEffect, useState } from 'react'
import { useExamStore } from '@/store/examStore'
import { LesenModule } from '@/components/modules/LesenModule'
import { SchreibenModule } from '@/components/modules/SchreibenModule'
import { HorenModule } from '@/components/modules/HorenModule'
import { SprechenModule } from '@/components/modules/SprechenModule'

interface ExamShellProps {
  sessionId: string
}

const MODULE_LABELS: Record<string, string> = {
  lesen: 'Lesen',
  schreiben: 'Schreiben',
  horen: 'Hören',
  sprechen: 'Sprechen',
}

export function ExamShell({ sessionId }: ExamShellProps) {
  const { session, setSession } = useExamStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch(`/api/exam/${sessionId}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to load exam')
        }
        const data = await res.json()
        setSession(data.session)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    loadSession()
  }, [sessionId, setSession])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-brand-gold border-t-transparent" />
          <p className="text-sm text-brand-muted">Prüfung wird geladen…</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg">
        <div className="rounded-xl bg-brand-white p-8 text-center shadow-card">
          <p className="mb-4 text-brand-red">{error || 'Session nicht gefunden'}</p>
          <a href="/" className="rounded-lg bg-brand-gold px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-gold-dark">
            Zurück
          </a>
        </div>
      </div>
    )
  }

  const moduleLabel = MODULE_LABELS[session.mode] || session.mode

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="sticky top-0 z-50 border-b border-brand-border bg-brand-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm font-bold text-brand-gold">DeutschTest.pro</a>
            <span className="text-brand-border">|</span>
            <span className="text-sm font-semibold text-brand-text">
              Goethe-Zertifikat {session.level}
            </span>
            <span className="rounded-full bg-brand-surface px-2.5 py-0.5 text-xs font-medium text-brand-muted">
              {moduleLabel}
            </span>
          </div>
        </div>
      </header>

      <div className="px-4 py-8">
        {session.mode === 'lesen' && <LesenModule />}
        {session.mode === 'horen' && <HorenModule />}
        {session.mode === 'schreiben' && <SchreibenModule />}
        {session.mode === 'sprechen' && <SprechenModule />}
      </div>
    </div>
  )
}
