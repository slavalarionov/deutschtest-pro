'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { formatEditorialMonthYear } from '@/lib/format/date'

interface SettingsViewProps {
  email: string
  initialName: string
  canChangePassword: boolean
  memberSince: string
}

export function SettingsView({
  email,
  initialName,
  canChangePassword,
  memberSince,
}: SettingsViewProps) {
  const t = useTranslations('dashboard.settings')

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 md:px-10 md:py-14">
      {/* Header */}
      <header className="mb-10">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="mt-3 font-display text-6xl leading-[1] tracking-[-0.035em] md:text-7xl">
          <span className="block text-ink">{t('headline.strong')}</span>
          <span className="block text-ink-soft">{t('headline.muted')}</span>
        </h1>
      </header>

      <div className="space-y-4">
        <ProfileCard
          email={email}
          initialName={initialName}
          memberSince={memberSince}
        />

        {canChangePassword ? (
          <PasswordCard />
        ) : (
          <ExternalProviderCard />
        )}

        <DangerZoneCard />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Profile                                                            */
/* ------------------------------------------------------------------ */

function ProfileCard({
  email,
  initialName,
  memberSince,
}: {
  email: string
  initialName: string
  memberSince: string
}) {
  const t = useTranslations('dashboard.settings.profile')
  const locale = useLocale()
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Clear the "Gespeichert" chip after 2 seconds.
  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(() => setSaved(false), 2000)
    return () => clearTimeout(timer)
  }, [saved])

  const displayName = name.trim() || initialName.trim()
  const initial = (displayName[0] || email[0] || '?').toLocaleUpperCase(locale)
  const memberSinceLabel = formatEditorialMonthYear(memberSince, locale)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/dashboard/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name.trim() }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || t('saveFailed'))
      } else {
        setSaved(true)
      }
    } catch {
      setError(t('network'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-rad border border-line bg-card p-8">
      <p className="eyebrow">{t('eyebrow')}</p>

      {/* Identity row */}
      <div className="mt-4 flex items-center gap-6">
        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft">
          <span className="font-display text-3xl text-accent-ink">
            {initial}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-2xl tracking-[-0.02em] text-ink">
            {displayName || email}
          </p>
          <p className="mt-1 truncate font-mono text-xs uppercase tracking-wide text-muted">
            {email} · {t('memberSinceMono')} {memberSinceLabel}
          </p>
        </div>
      </div>

      <div className="my-8 border-t border-line" />

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label htmlFor="settings-name" className="block">
          <span className="block font-mono text-[11px] uppercase tracking-wide text-muted">
            {t('nameEyebrow')}
          </span>
          <input
            id="settings-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder={t('namePlaceholder')}
            className="mt-2 w-full rounded-rad-sm border border-line bg-page px-4 py-3 text-sm text-ink transition-colors placeholder:text-muted focus:border-ink focus:outline-none"
          />
        </label>

        <div className="mt-2 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={saving || name.trim() === initialName.trim()}
            className="inline-flex items-center gap-2 rounded-rad-pill bg-ink px-6 py-3 text-sm font-medium text-page transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Spinner />
                {t('saving')}
              </>
            ) : (
              t('saveButton')
            )}
          </button>

          {saved && (
            <span className="flex items-center gap-2 text-sm text-ink-soft animate-in fade-in">
              <span className="h-2 w-2 rounded-full bg-accent" />
              {t('savedChip')}
            </span>
          )}

          {error && <p className="text-sm text-error">{error}</p>}
        </div>
      </form>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Password                                                           */
/* ------------------------------------------------------------------ */

function PasswordCard() {
  const t = useTranslations('dashboard.settings.password')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [updated, setUpdated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Clear the "Aktualisiert" chip after 2 seconds.
  useEffect(() => {
    if (!updated) return
    const timer = setTimeout(() => setUpdated(false), 2000)
    return () => clearTimeout(timer)
  }, [updated])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setUpdated(false)

    if (next.length < 8) {
      setError(t('tooShort'))
      return
    }
    if (next !== confirm) {
      setError(t('mismatch'))
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: current,
          newPassword: next,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || t('changeFailed'))
      } else {
        setUpdated(true)
        setCurrent('')
        setNext('')
        setConfirm('')
      }
    } catch {
      setError(t('network'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-rad border border-line bg-card p-8">
      <p className="eyebrow">{t('eyebrow')}</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <PasswordField
          id="settings-current"
          label={t('currentEyebrow')}
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
          required
        />
        <PasswordField
          id="settings-new"
          label={t('newEyebrow')}
          value={next}
          onChange={setNext}
          autoComplete="new-password"
          minLength={8}
          required
          hint={t('hintMono')}
        />
        <PasswordField
          id="settings-confirm"
          label={t('confirmEyebrow')}
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          minLength={8}
          required
        />

        {error && (
          <div className="rounded-rad-sm border border-error/20 bg-error-soft p-3 text-sm text-error">
            {error}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={saving || !current || !next || !confirm}
            className="inline-flex items-center gap-2 rounded-rad-pill bg-ink px-6 py-3 text-sm font-medium text-page transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Spinner />
                {t('saving')}
              </>
            ) : (
              t('changeButton')
            )}
          </button>

          {updated && (
            <span className="flex items-center gap-2 text-sm text-ink-soft animate-in fade-in">
              <span className="h-2 w-2 rounded-full bg-accent" />
              {t('updatedChip')}
            </span>
          )}
        </div>
      </form>
    </section>
  )
}

function ExternalProviderCard() {
  const t = useTranslations('dashboard.settings.password')
  return (
    <section className="rounded-rad border border-line bg-card p-8">
      <p className="eyebrow">{t('externalEyebrow')}</p>
      <p className="mt-4 text-ink-soft">{t('externalLeadV2')}</p>
      <p className="mt-2 font-mono text-xs uppercase tracking-wide text-muted">
        {t('externalHintV2')}
      </p>
    </section>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  required,
  minLength,
  hint,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  required?: boolean
  minLength?: number
  hint?: string
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="block font-mono text-[11px] uppercase tracking-wide text-muted">
        {label}
      </span>
      <input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        className="mt-2 w-full rounded-rad-sm border border-line bg-page px-4 py-3 text-sm text-ink transition-colors placeholder:text-muted focus:border-ink focus:outline-none"
      />
      {hint && (
        <span className="mt-2 block font-mono text-[11px] uppercase tracking-wide text-muted">
          {hint}
        </span>
      )}
    </label>
  )
}

/* ------------------------------------------------------------------ */
/*  Danger zone                                                        */
/* ------------------------------------------------------------------ */

function DangerZoneCard() {
  const t = useTranslations('dashboard.settings.delete')
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <section className="rounded-rad border border-line bg-card p-8">
        <p className="eyebrow">{t('eyebrow')}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-xl tracking-[-0.02em] text-ink">
              {t('titleV2')}
            </p>
            <p className="mt-1 text-sm text-ink-soft">{t('hintV2')}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center rounded-rad-pill border border-error px-6 py-3 text-sm font-medium text-error transition-colors hover:bg-error-soft"
          >
            {t('button')}
          </button>
        </div>
      </section>

      {showModal && <DeleteModal onClose={() => setShowModal(false)} />}
    </>
  )
}

function DeleteModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations('dashboard.settings.delete')

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-rad border border-line bg-card p-8"
      >
        <p className="eyebrow">{t('eyebrow')}</p>
        <h3 className="mt-2 font-display text-2xl tracking-[-0.02em] text-ink">
          {t('modalH3')}
        </h3>
        <p className="mt-4 text-ink-soft">
          {t.rich('modalBody', {
            email: (chunks) => (
              <a
                href="mailto:contact@deutschtest.pro"
                className="font-semibold text-ink underline underline-offset-4 transition-colors hover:text-accent-ink"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
        <p className="mt-4 font-mono text-xs uppercase tracking-wide text-muted">
          {t('modalHint')}
        </p>
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-rad-pill border border-line px-6 py-3 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="12" cy="12" r="9" className="opacity-25" />
      <path d="M21 12a9 9 0 0 1-9 9" className="opacity-90" />
    </svg>
  )
}
