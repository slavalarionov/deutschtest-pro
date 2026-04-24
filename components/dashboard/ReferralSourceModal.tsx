'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

type SourceId =
  | 'ai'
  | 'search'
  | 'friend'
  | 'teacher'
  | 'ads'
  | 'social'
  | 'other'

const OPTIONS: readonly SourceId[] = [
  'ai',
  'search',
  'friend',
  'teacher',
  'ads',
  'social',
  'other',
] as const

interface ReferralSourceModalProps {
  onSubmit: (source: SourceId | 'skipped') => Promise<void> | void
}

export function ReferralSourceModal({ onSubmit }: ReferralSourceModalProps) {
  const t = useTranslations('dashboard.referralSurvey')
  const [submitting, setSubmitting] = useState<SourceId | 'skipped' | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const firstButtonRef = useRef<HTMLButtonElement | null>(null)

  const busy = submitting !== null

  useEffect(() => {
    firstButtonRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (busy) return
      if (e.key === 'Escape') {
        e.preventDefault()
        void handleChoose('skipped')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy])

  async function handleChoose(source: SourceId | 'skipped') {
    if (busy) return
    setSubmitting(source)
    try {
      await onSubmit(source)
    } finally {
      // Parent unmounts on success; reset only if still mounted.
      setSubmitting(null)
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (busy) return
    if (e.target === e.currentTarget) {
      void handleChoose('skipped')
    }
  }

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm animate-in fade-in"
      data-testid="referral-survey-modal"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="referral-survey-title"
        className="relative w-full max-w-lg rounded-rad border border-line bg-card p-8 shadow-lift"
      >
        <button
          type="button"
          onClick={() => handleChoose('skipped')}
          disabled={busy}
          aria-label={t('close')}
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-rad-pill text-muted transition-colors hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            viewBox="0 0 20 20"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M5 5l10 10M15 5 5 15" />
          </svg>
        </button>

        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {t('eyebrow')}
        </p>
        <h2
          id="referral-survey-title"
          className="mt-2 font-display text-3xl leading-tight tracking-[-0.02em] text-ink"
        >
          {t('title')}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {t('subtitle')}
        </p>

        <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {OPTIONS.map((id, idx) => (
            <li key={id}>
              <button
                ref={idx === 0 ? firstButtonRef : undefined}
                type="button"
                onClick={() => handleChoose(id)}
                disabled={busy}
                data-testid={`referral-option-${id}`}
                className="group flex h-14 w-full items-center gap-3 rounded-rad-sm border border-line bg-surface px-4 text-left text-sm text-ink-soft transition-colors hover:border-ink/40 hover:bg-accent-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50"
              >
                <OptionIcon id={id} />
                <span className="flex-1">{t(`options.${id}`)}</span>
                {submitting === id && <Spinner />}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => handleChoose('skipped')}
            disabled={busy}
            data-testid="referral-survey-skip"
            className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting === 'skipped' && <Spinner />}
            {t('skip')}
          </button>
        </div>
      </div>
    </div>
  )
}

function OptionIcon({ id }: { id: SourceId }) {
  const paths: Record<SourceId, React.ReactNode> = {
    ai: (
      <>
        <path d="M12 3 13.6 8l5 1.6-5 1.6L12 16l-1.6-5L5.4 9.6l5-1.6z" />
        <path d="M18 4l.8 2.2L21 7l-2.2.8L18 10l-.8-2.2L15 7l2.2-.8z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="m20 20-4.2-4.2" />
      </>
    ),
    friend: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <circle cx="17" cy="8" r="2.5" />
        <path d="M21 18c0-2.5-1.9-4.5-4.3-4.5" />
      </>
    ),
    teacher: (
      <>
        <path d="M3 6h8a2 2 0 0 1 2 2v12H5a2 2 0 0 1-2-2V6Z" />
        <path d="M21 6h-8a2 2 0 0 0-2 2v12h8a2 2 0 0 0 2-2V6Z" />
      </>
    ),
    ads: (
      <>
        <path d="M3 11v2a1 1 0 0 0 1 1h3l6 5V5L7 10H4a1 1 0 0 0-1 1Z" />
        <path d="M17 8a5 5 0 0 1 0 8" />
      </>
    ),
    social: (
      <>
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="6" r="2.5" />
        <circle cx="18" cy="18" r="2.5" />
        <path d="m8 11 8-4M8 13l8 4" />
      </>
    ),
    other: (
      <>
        <circle cx="6" cy="12" r="1.2" />
        <circle cx="12" cy="12" r="1.2" />
        <circle cx="18" cy="12" r="1.2" />
      </>
    ),
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5 shrink-0 text-muted transition-colors group-hover:text-ink"
    >
      {paths[id]}
    </svg>
  )
}

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 animate-spin text-muted"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="12" cy="12" r="9" className="opacity-25" />
      <path d="M21 12a9 9 0 0 1-9 9" />
    </svg>
  )
}
