'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

interface ShareSectionProps {
  sessionId: string
  module: 'lesen' | 'horen' | 'schreiben' | 'sprechen'
  moduleLabel: string
  score: number | undefined
}

type ToneKey = 'high' | 'midHigh' | 'midLow' | 'low'

function toneFor(score: number | undefined): ToneKey {
  if (score === undefined) return 'midLow'
  if (score >= 80) return 'high'
  if (score >= 60) return 'midHigh'
  if (score >= 40) return 'midLow'
  return 'low'
}

export function ShareSection({ sessionId, module, moduleLabel, score }: ShareSectionProps) {
  const t = useTranslations('results.share')
  const tScoreCard = useTranslations('results.scoreCard')

  const [publicId, setPublicId] = useState<string | null>(null)
  const [isPublic, setIsPublic] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [togglePending, setTogglePending] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      try {
        const res = await fetch(`/api/exam/${sessionId}/share`, { method: 'POST' })
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.ok && json.success) {
          setPublicId(json.publicId as string)
          setIsPublic(Boolean(json.isPublic))
        } else {
          setError(t('errorGeneric'))
        }
      } catch {
        if (!cancelled) setError(t('errorGeneric'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    bootstrap()
    return () => {
      cancelled = true
    }
  }, [sessionId, t])

  async function togglePrivacy() {
    if (togglePending) return
    setTogglePending(true)
    const next = !isPublic
    try {
      const res = await fetch(`/api/exam/${sessionId}/share`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: next }),
      })
      if (res.ok) {
        setIsPublic(next)
      } else {
        setError(t('errorGeneric'))
      }
    } catch {
      setError(t('errorGeneric'))
    } finally {
      setTogglePending(false)
    }
  }

  const publicUrl = publicId && typeof window !== 'undefined'
    ? `${window.location.origin}/result/${publicId}`
    : ''
  const tone = toneFor(score)
  const status = tScoreCard(`summary.${tone}.subtitle`).replace(/[.!]+$/, '')
  const scoreText = score !== undefined ? `${score}/100` : '—/100'
  const message = t('message', {
    module: moduleLabel,
    score: scoreText,
    status,
    url: publicUrl,
  })
  const emailSubject = t('emailSubject', {
    module: moduleLabel,
    score: scoreText,
  })

  const disabled = loading || !publicId || !isPublic
  const whatsappHref = disabled
    ? undefined
    : `https://wa.me/?text=${encodeURIComponent(message)}`
  const telegramHref = disabled
    ? undefined
    : `https://t.me/share/url?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(
        message,
      )}`
  const emailHref = disabled
    ? undefined
    : `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(message)}`

  async function copyLink() {
    if (disabled) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError(t('errorGeneric'))
    }
  }

  return (
    <section className="rounded-rad border border-line bg-card p-6 sm:p-8">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
        {t('title')}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <ShareButton
          href={whatsappHref}
          disabled={disabled}
          label={t('whatsapp')}
          onClick={undefined}
        />
        <ShareButton
          href={telegramHref}
          disabled={disabled}
          label={t('telegram')}
          onClick={undefined}
        />
        <ShareButton
          href={emailHref}
          disabled={disabled}
          label={t('email')}
          onClick={undefined}
        />
        <ShareButton
          href={undefined}
          disabled={disabled}
          label={copied ? t('copied') : t('copy')}
          onClick={copyLink}
          highlighted={copied}
        />
      </div>

      {publicUrl && isPublic && (
        <div className="mt-4 break-all font-mono text-xs text-muted">{publicUrl}</div>
      )}

      <div className="mt-6 border-t border-line pt-4 text-sm text-muted">
        {t('pdfHint')}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {isPublic ? t('publicNote') : t('privateNote')}
        </span>
        <button
          type="button"
          onClick={togglePrivacy}
          disabled={togglePending || loading}
          className="text-xs font-medium text-ink-soft underline underline-offset-4 transition-colors hover:text-ink disabled:opacity-50"
        >
          {isPublic ? t('makePrivate') : t('makePublic')}
        </button>
      </div>

      {error && <div className="mt-3 text-sm text-error">{error}</div>}
    </section>
  )
}

function ShareButton({
  href,
  disabled,
  label,
  onClick,
  highlighted,
}: {
  href: string | undefined
  disabled: boolean
  label: string
  onClick: (() => void) | undefined
  highlighted?: boolean
}) {
  const baseClass =
    'inline-flex items-center justify-center rounded-rad-pill px-5 py-2.5 text-sm font-medium transition-colors'
  const stateClass = disabled
    ? 'cursor-not-allowed border border-line bg-line text-muted'
    : highlighted
      ? 'bg-accent text-card hover:bg-accent/90'
      : 'border border-line bg-card text-ink hover:bg-surface'

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={`${baseClass} ${stateClass}`}
        aria-disabled={disabled || undefined}
      >
        {label}
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${stateClass}`}
    >
      {label}
    </button>
  )
}
