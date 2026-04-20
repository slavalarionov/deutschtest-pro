'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'

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
  const t = useTranslations('results.retakeModal')
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
        setError(data.error || t('errorFallback'))
        setLoading(false)
        return
      }
      router.push(`/exam/${data.newSessionId}`)
    } catch {
      setError(t('errorNetwork'))
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-page/80 p-4">
      <div className="w-full max-w-md rounded-rad border border-line bg-card p-8 shadow-lift">
        <h3 className="font-display text-xl font-medium tracking-tight text-ink">
          {t('title')}
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          {t.rich('body', {
            module: moduleLabel,
            b: (chunks) => (
              <strong className="font-medium text-ink">{chunks}</strong>
            ),
          })}
        </p>
        <div className="mt-5 rounded-rad-sm border border-line bg-surface px-4 py-3 text-sm text-ink-soft">
          {t.rich('balance', {
            current: modulesBalance,
            next: modulesBalance - 1,
            b: (chunks) => (
              <strong className="font-medium text-accent-ink">{chunks}</strong>
            ),
          })}
        </div>
        {error && (
          <p className="mt-4 text-sm text-error">{error}</p>
        )}
        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex items-center rounded-rad-pill border border-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="inline-flex items-center rounded-rad-pill bg-ink px-5 py-2 text-sm font-medium text-page transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t('confirming') : t('confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
