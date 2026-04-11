'use client'

interface TimeUpOverlayProps {
  /** Optional extra line under the main message */
  detail?: string
}

export function TimeUpOverlay({ detail }: TimeUpOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 max-w-md rounded-2xl bg-brand-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-bold text-brand-text">Zeit ist um</h2>
        <p className="mb-4 text-sm text-brand-muted">
          Ihre Antworten werden automatisch gesendet.
        </p>
        {detail && <p className="mb-4 text-xs text-brand-muted">{detail}</p>}
        <div className="mx-auto h-1.5 w-32 overflow-hidden rounded-full bg-brand-surface">
          <div className="h-full animate-progress rounded-full bg-brand-gold" />
        </div>
      </div>
    </div>
  )
}
