'use client'

import { useParams } from 'next/navigation'

export default function ResultsPage() {
  const params = useParams<{ sessionId: string }>()

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-semibold text-brand-text">
        Ergebnisse
      </h1>
      <p className="mb-8 text-brand-muted">
        Prüfung {params.sessionId}
      </p>

      <div className="grid grid-cols-2 gap-4">
        {(['Lesen', 'Hören', 'Schreiben', 'Sprechen'] as const).map(
          (module) => (
            <div
              key={module}
              className="rounded-xl bg-brand-white p-6 shadow-soft"
            >
              <h3 className="mb-1 text-sm font-medium text-brand-muted">
                {module}
              </h3>
              <p className="text-3xl font-semibold text-brand-text">—</p>
              <p className="mt-1 text-xs text-brand-muted">/ 100 Punkte</p>
            </div>
          )
        )}
      </div>

      <div className="mt-8 rounded-xl bg-brand-white p-6 shadow-soft">
        <h2 className="mb-4 text-lg font-semibold text-brand-text">
          KI-Feedback
        </h2>
        <p className="text-sm text-brand-muted">
          Feedback wird nach der Implementierung hier angezeigt.
        </p>
      </div>
    </div>
  )
}
