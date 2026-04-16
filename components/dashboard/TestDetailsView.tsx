'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { RetakeModuleModal } from '@/components/exam/RetakeModuleModal'
import type {
  TestDetails,
  LesenHorenAttemptFeedback,
} from '@/lib/dashboard/test-details'
import type {
  SchreibenContent,
  SchreibenFeedback,
  SprechenContent,
  SprechenFeedback,
} from '@/types/exam'

const MODULE_LABELS: Record<TestDetails['module'], string> = {
  lesen: 'Lesen',
  horen: 'Hören',
  schreiben: 'Schreiben',
  sprechen: 'Sprechen',
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  const color =
    pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-brand-gold' : 'bg-brand-red'
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-surface">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

interface TestDetailsViewProps {
  details: TestDetails
  modulesBalance: number
}

export function TestDetailsView({
  details,
  modulesBalance,
}: TestDetailsViewProps) {
  const router = useRouter()
  const [retakeOpen, setRetakeOpen] = useState(false)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard/history"
          className="text-sm text-brand-muted hover:text-brand-text"
        >
          ← Zurück zum Verlauf
        </Link>
      </div>

      <div className="rounded-2xl bg-brand-white p-8 text-center shadow-soft">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-muted">
          Goethe-Zertifikat {details.level} — {MODULE_LABELS[details.module]}
        </p>
        <div className="mb-2 text-6xl font-bold text-brand-text">
          {details.score}
        </div>
        <p className="text-sm text-brand-muted">von 100 Punkten</p>
        <ProgressBar value={details.score} max={100} />
        <p
          className={`mt-4 text-lg font-bold ${
            details.passed ? 'text-green-700' : 'text-brand-red'
          }`}
        >
          {details.passed ? 'Bestanden ✅' : 'Nicht bestanden ❌'}
        </p>
        <p className="mt-4 text-xs text-brand-muted">
          Abgegeben am {formatDate(details.submittedAt)}
          {' · '}
          {details.isFreeTest ? 'Kostenlos' : 'Bezahlt'}
        </p>
      </div>

      {(details.module === 'lesen' || details.module === 'horen') && (
        <LesenHorenSection
          module={details.module}
          feedback={details.feedback}
        />
      )}

      {details.module === 'schreiben' && (
        <SchreibenSection
          feedback={details.feedback}
          content={details.content}
        />
      )}

      {details.module === 'sprechen' && (
        <SprechenSection
          feedback={details.feedback}
          content={details.content}
        />
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          href="/dashboard/history"
          className="rounded-lg border border-brand-border bg-brand-white px-6 py-2.5 text-sm font-semibold text-brand-text transition hover:bg-brand-surface"
        >
          Zurück zum Verlauf
        </Link>
        <button
          type="button"
          onClick={() => {
            if (modulesBalance > 0) {
              setRetakeOpen(true)
            } else {
              router.push('/pricing')
            }
          }}
          className="rounded-lg bg-brand-gold px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-gold-dark"
        >
          Modul wiederholen
        </button>
      </div>

      <RetakeModuleModal
        open={retakeOpen}
        onClose={() => setRetakeOpen(false)}
        originalSessionId={details.sessionId}
        module={details.module}
        moduleLabel={MODULE_LABELS[details.module]}
        modulesBalance={modulesBalance}
      />
    </div>
  )
}

function LesenHorenSection({
  module,
  feedback,
}: {
  module: 'lesen' | 'horen'
  feedback: LesenHorenAttemptFeedback | null
}) {
  if (!feedback || !feedback.details || !feedback.summary) {
    return (
      <div className="rounded-2xl bg-brand-white p-6 text-center shadow-soft">
        <p className="text-sm text-brand-muted">
          Keine detaillierten Antworten gespeichert.
        </p>
      </div>
    )
  }

  const entries = Object.entries(feedback.details)
  const wrong = entries.filter(([, d]) => !d.isCorrect)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-brand-white p-6 shadow-soft">
        <h3 className="mb-4 text-base font-semibold text-brand-text">
          {MODULE_LABELS[module]} — Zusammenfassung
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg bg-green-50 px-4 py-2">
            <span className="text-lg font-bold text-green-700">
              {feedback.summary.correct}
            </span>
            <span className="ml-1 text-xs text-green-600">richtig</span>
          </div>
          <div className="rounded-lg bg-red-50 px-4 py-2">
            <span className="text-lg font-bold text-brand-red">
              {feedback.summary.total - feedback.summary.correct}
            </span>
            <span className="ml-1 text-xs text-red-600">falsch</span>
          </div>
          <div className="rounded-lg bg-brand-surface px-4 py-2">
            <span className="text-lg font-bold text-brand-text">
              {feedback.summary.total}
            </span>
            <span className="ml-1 text-xs text-brand-muted">gesamt</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-brand-white p-6 shadow-soft">
        <h3 className="mb-4 text-base font-semibold text-brand-text">
          Alle Antworten
        </h3>
        <div className="space-y-2">
          {entries.map(([id, detail]) => (
            <div
              key={id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-2.5 ${
                detail.isCorrect ? 'bg-green-50/40' : 'bg-red-50/40'
              }`}
            >
              <span className="text-xs font-medium text-brand-text">
                Aufgabe {id}
              </span>
              <div className="flex flex-wrap gap-3 text-xs">
                <span
                  className={
                    detail.isCorrect ? 'text-green-700' : 'text-red-600'
                  }
                >
                  Ihre:{' '}
                  <strong>{detail.userAnswer || '—'}</strong>
                </span>
                {!detail.isCorrect && (
                  <span className="text-green-700">
                    Richtig: <strong>{detail.correctAnswer}</strong>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        {wrong.length === 0 && (
          <p className="mt-4 text-center text-xs text-green-700">
            Alle Antworten richtig — super!
          </p>
        )}
      </div>
    </div>
  )
}

function SchreibenSection({
  feedback,
  content,
}: {
  feedback: SchreibenFeedback | null
  content: SchreibenContent | null
}) {
  const criteria = feedback
    ? ([
        ['Aufgabenerfüllung', feedback.criteria.taskFulfillment, 25],
        ['Kohärenz', feedback.criteria.coherence, 25],
        ['Wortschatz', feedback.criteria.vocabulary, 25],
        ['Grammatik', feedback.criteria.grammar, 25],
      ] as const)
    : []

  return (
    <div className="space-y-4">
      {content?.tasks?.[0] && (
        <div className="rounded-2xl bg-brand-white p-6 shadow-soft">
          <h3 className="mb-3 text-base font-semibold text-brand-text">
            Aufgabe
          </h3>
          <p className="mb-3 text-sm font-medium text-brand-text">
            {content.tasks[0].situation}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">
            {content.tasks[0].prompt}
          </p>
          {content.tasks[0].requiredPoints?.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-brand-muted">
              {content.tasks[0].requiredPoints.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {feedback ? (
        <>
          <div className="rounded-2xl bg-brand-white p-6 shadow-soft">
            <h3 className="mb-4 text-base font-semibold text-brand-text">
              Bewertung nach Kriterien
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {criteria.map(([label, score, max]) => (
                <div key={label} className="rounded-lg bg-brand-bg p-4">
                  <p className="text-xs font-medium text-brand-muted">
                    {label}
                  </p>
                  <div className="mt-1 flex items-end gap-1">
                    <span className="text-2xl font-bold text-brand-text">
                      {score}
                    </span>
                    <span className="mb-0.5 text-xs text-brand-muted">
                      / {max}
                    </span>
                  </div>
                  <ProgressBar value={score} max={max} />
                </div>
              ))}
            </div>
          </div>

          {feedback.comment && (
            <div className="rounded-2xl bg-brand-white p-6 shadow-soft">
              <h4 className="mb-3 text-sm font-semibold text-brand-text">
                KI-Feedback
              </h4>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">
                {feedback.comment}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl bg-brand-white p-6 text-center shadow-soft">
          <p className="text-sm text-brand-muted">
            Kein detailliertes Feedback verfügbar.
          </p>
        </div>
      )}
    </div>
  )
}

function SprechenSection({
  feedback,
  content,
}: {
  feedback: SprechenFeedback | null
  content: SprechenContent | null
}) {
  const criteria = feedback
    ? ([
        ['Aufgabenerfüllung', feedback.criteria.taskFulfillment, 20],
        ['Flüssigkeit', feedback.criteria.fluency, 20],
        ['Wortschatz', feedback.criteria.vocabulary, 20],
        ['Grammatik', feedback.criteria.grammar, 20],
        ['Aussprache', feedback.criteria.pronunciation, 20],
      ] as const)
    : []

  return (
    <div className="space-y-4">
      {content?.tasks && content.tasks.length > 0 && (
        <div className="rounded-2xl bg-brand-white p-6 shadow-soft">
          <h3 className="mb-3 text-base font-semibold text-brand-text">
            Aufgaben
          </h3>
          <div className="space-y-3">
            {content.tasks.map((task, idx) => (
              <div key={task.id} className="rounded-lg bg-brand-bg p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">
                  Teil {idx + 1} · {task.type}
                </p>
                <p className="mt-1 text-sm font-medium text-brand-text">
                  {task.topic}
                </p>
                {task.points?.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-brand-muted">
                    {task.points.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {feedback ? (
        <>
          <div className="rounded-2xl bg-brand-white p-6 shadow-soft">
            <h3 className="mb-4 text-base font-semibold text-brand-text">
              Bewertung nach Kriterien
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {criteria.map(([label, score, max]) => (
                <div key={label} className="rounded-lg bg-brand-bg p-4">
                  <p className="text-xs font-medium text-brand-muted">
                    {label}
                  </p>
                  <div className="mt-1 flex items-end gap-1">
                    <span className="text-2xl font-bold text-brand-text">
                      {score}
                    </span>
                    <span className="mb-0.5 text-xs text-brand-muted">
                      / {max}
                    </span>
                  </div>
                  <ProgressBar value={score} max={max} />
                </div>
              ))}
            </div>
          </div>

          {feedback.comment && (
            <div className="rounded-2xl bg-brand-white p-6 shadow-soft">
              <h4 className="mb-3 text-sm font-semibold text-brand-text">
                KI-Feedback
              </h4>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">
                {feedback.comment}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl bg-brand-white p-6 text-center shadow-soft">
          <p className="text-sm text-brand-muted">
            Kein detailliertes Feedback verfügbar.
          </p>
        </div>
      )}
    </div>
  )
}
