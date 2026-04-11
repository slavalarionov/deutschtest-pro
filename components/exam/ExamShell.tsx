'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useExamStore } from '@/store/examStore'
import { LesenModule } from '@/components/modules/LesenModule'
import { SchreibenModule } from '@/components/modules/SchreibenModule'
import { HorenModule } from '@/components/modules/HorenModule'
import { SprechenModule } from '@/components/modules/SprechenModule'
import { isMultiModuleSession, parseModuleOrder } from '@/lib/exam/module-order'

interface ExamShellProps {
  sessionId: string
}

const MODULE_LABELS: Record<string, string> = {
  lesen: 'Lesen',
  schreiben: 'Schreiben',
  horen: 'Hören',
  sprechen: 'Sprechen',
}

function MultiProgressBar({
  activeModule,
  moduleOrder,
}: {
  activeModule: string
  moduleOrder: string[]
}) {
  const idx = moduleOrder.indexOf(activeModule)
  const currentIndex = idx >= 0 ? idx + 1 : 1
  const total = moduleOrder.length
  const pct = total > 0 ? (currentIndex / total) * 100 : 0
  const label = MODULE_LABELS[activeModule] || activeModule

  return (
    <div className="border-b border-brand-border/80 bg-brand-surface/60 px-4 py-2">
      <div className="mx-auto flex max-w-5xl flex-col gap-1.5">
        <p className="text-center text-xs font-medium text-brand-text">
          Modul {currentIndex}/{total}: {label}
        </p>
        <div className="h-1 overflow-hidden rounded-full bg-brand-border/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-gold to-amber-600 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export function ExamShell({ sessionId }: ExamShellProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { session, setSession } = useExamStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resumeOpen, setResumeOpen] = useState(false)

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

  const syncUrlAndResume = useCallback(() => {
    if (!session) return

    const qModule = searchParams.get('module')
    const moduleOrder = parseModuleOrder(session.mode, session.sessionFlow)
    const isMulti = isMultiModuleSession(session.mode, session.sessionFlow)
    const current = session.currentModule
    const freshStart = searchParams.get('fresh') === '1'

    if (!isMulti || !current || current === 'completed') return

    if (!qModule || qModule !== current) {
      router.replace(`/exam/${sessionId}?module=${current}`)
      return
    }

    const completed = session.completedModules
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const remaining = moduleOrder.filter((m) => !completed.includes(m))

    const dismissed =
      freshStart
      || (typeof window !== 'undefined'
        && sessionStorage.getItem(`exam_resume_ok_${sessionId}`) === '1')

    if (completed.length > 0 && remaining.length > 0 && !dismissed) {
      setResumeOpen(true)
    }
  }, [session, searchParams, router, sessionId])

  useEffect(() => {
    if (!loading && session) {
      syncUrlAndResume()
    }
  }, [loading, session, syncUrlAndResume])

  useEffect(() => {
    if (!session || searchParams.get('fresh') !== '1') return
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`exam_resume_ok_${sessionId}`, '1')
    }
    const order = parseModuleOrder(session.mode, session.sessionFlow)
    const m = searchParams.get('module') || session.currentModule || order[0] || 'lesen'
    router.replace(`/exam/${sessionId}?module=${m}`)
  }, [session, searchParams, sessionId, router])

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

  const moduleOrder = parseModuleOrder(session.mode, session.sessionFlow)
  const isMulti = isMultiModuleSession(session.mode, session.sessionFlow)
  const qModule = searchParams.get('module')

  const activeModule: string = isMulti && qModule
    ? qModule
    : session.mode === 'full'
      ? (session.currentModule ?? moduleOrder[0] ?? 'lesen')
      : moduleOrder[0] ?? session.mode

  if (isMulti && session.currentModule === 'completed') {
    router.replace(`/exam/${sessionId}/results`)
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg">
        <p className="text-sm text-brand-muted">Weiterleitung zu den Ergebnissen…</p>
      </div>
    )
  }

  const moduleLabel = MODULE_LABELS[activeModule] || activeModule

  const completed = session.completedModules
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const remaining = moduleOrder.filter((m) => !completed.includes(m))

  function handleResumeContinue() {
    if (!session) return
    sessionStorage.setItem(`exam_resume_ok_${sessionId}`, '1')
    setResumeOpen(false)
    if (session.currentModule && session.currentModule !== 'completed') {
      router.replace(`/exam/${sessionId}?module=${session.currentModule}`)
    }
  }

  async function handleResumeRestart() {
    try {
      const res = await fetch('/api/exam/reset-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json()
      if (data.success) {
        sessionStorage.removeItem(`exam_resume_ok_${sessionId}`)
        router.push('/')
      }
    } catch {
      /* silent */
    }
  }

  const completedLabels = completed.map((m) => MODULE_LABELS[m] || m).join(', ')
  const remainingLabels = remaining.map((m) => MODULE_LABELS[m] || m).join(', ')

  return (
    <div className="min-h-screen bg-brand-bg">
      {resumeOpen && isMulti && session.currentModule && session.currentModule !== 'completed' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="max-w-md rounded-2xl bg-brand-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-brand-text">Test fortsetzen?</h2>
            <p className="mt-2 text-sm text-brand-muted">
              Diese Auswahl ist noch nicht abgeschlossen.
            </p>
            {completed.length > 0 && (
              <p className="mt-2 text-sm text-brand-text">
                <span className="font-semibold">Erledigt:</span> {completedLabels}
              </p>
            )}
            {remaining.length > 0 && (
              <p className="mt-1 text-sm text-brand-text">
                <span className="font-semibold">Noch offen:</span> {remainingLabels}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleResumeRestart}
                className="rounded-lg border border-brand-border px-4 py-2.5 text-sm font-medium text-brand-text transition hover:bg-brand-surface"
              >
                Neu starten
              </button>
              <button
                type="button"
                onClick={handleResumeContinue}
                className="rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-gold-dark"
              >
                Fortfahren
              </button>
            </div>
          </div>
        </div>
      )}

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

      {isMulti && moduleOrder.length > 0 && (
        <MultiProgressBar activeModule={activeModule} moduleOrder={moduleOrder} />
      )}

      <div className="px-4 py-8">
        {activeModule === 'lesen' && <LesenModule />}
        {activeModule === 'horen' && <HorenModule />}
        {activeModule === 'schreiben' && <SchreibenModule />}
        {activeModule === 'sprechen' && <SprechenModule />}
      </div>
    </div>
  )
}
