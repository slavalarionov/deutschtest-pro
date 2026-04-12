'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface RetakeModuleModalProps {
  open: boolean
  onClose: () => void
  originalSessionId: string
  module: 'lesen' | 'horen' | 'schreiben' | 'sprechen'
  moduleLabel: string
  modulesBalance: number
}

export function RetakeModuleModal({
  open,
  onClose,
  originalSessionId,
  module,
  moduleLabel,
  modulesBalance,
}: RetakeModuleModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/exam/retake-module', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalSessionId, module }),
      })
      const data = await res.json()
      if (res.status === 402) {
        router.push('/pricing')
        return
      }
      if (!data.success) {
        setError(data.error || 'Fehler beim Erstellen der neuen Prüfung')
        setLoading(false)
        return
      }
      router.push(`/exam/${data.newSessionId}`)
    } catch {
      setError('Netzwerkfehler')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-brand-white p-6 shadow-xl">
        <h3 className="mb-3 text-lg font-semibold text-brand-text">
          Modul erneut absolvieren
        </h3>
        <p className="mb-4 text-sm text-brand-muted">
          Sie starten eine neue {moduleLabel}-Prüfung mit komplett neuen Aufgaben.
          Dafür wird <strong>1 Modul</strong> von Ihrem Guthaben abgezogen.
        </p>
        <p className="mb-5 text-sm text-brand-text">
          Aktuelles Guthaben: <strong>{modulesBalance} Module</strong> → nach dem
          Start: <strong>{modulesBalance - 1} Module</strong>
        </p>
        {error && <p className="mb-3 text-sm text-brand-red">{error}</p>}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-brand-border bg-brand-white px-4 py-2 text-sm font-semibold text-brand-text hover:bg-brand-surface"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-white hover:bg-brand-gold-dark disabled:opacity-50"
          >
            {loading ? 'Wird gestartet…' : 'Ja, starten'}
          </button>
        </div>
      </div>
    </div>
  )
}
