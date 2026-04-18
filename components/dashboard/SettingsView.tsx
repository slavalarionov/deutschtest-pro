'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface SettingsViewProps {
  email: string
  initialName: string
  canChangePassword: boolean
}

export function SettingsView({
  email,
  initialName,
  canChangePassword,
}: SettingsViewProps) {
  const t = useTranslations('dashboard.settings')

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">{t('title')}</h1>
        <p className="mt-1 text-sm text-brand-muted">{t('subtitle')}</p>
      </div>

      <ProfileSection email={email} initialName={initialName} />

      {canChangePassword ? (
        <PasswordSection />
      ) : (
        <Card>
          <h2 className="text-lg font-semibold text-brand-text">
            {t('password.externalTitle')}
          </h2>
          <p className="mt-2 text-sm text-brand-muted">
            {t('password.externalText')}
          </p>
        </Card>
      )}

      <DeleteAccountSection />
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-brand-white p-6 shadow-soft">
      {children}
    </section>
  )
}

function ProfileSection({
  email,
  initialName,
}: {
  email: string
  initialName: string
}) {
  const t = useTranslations('dashboard.settings.profile')
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<
    { kind: 'ok' | 'err'; text: string } | null
  >(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/dashboard/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name.trim() }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setMessage({
          kind: 'err',
          text: json.error || t('saveFailed'),
        })
      } else {
        setMessage({ kind: 'ok', text: t('saved') })
      }
    } catch {
      setMessage({ kind: 'err', text: t('network') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-brand-text">{t('title')}</h2>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Field label={t('emailLabel')}>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full cursor-not-allowed rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-muted"
          />
          <p className="mt-1 text-xs text-brand-muted">{t('emailHint')}</p>
        </Field>

        <Field label={t('nameLabel')}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder={t('namePlaceholder')}
            className="w-full rounded-lg border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-text focus:border-brand-gold focus:outline-none"
          />
        </Field>

        {message && (
          <p
            className={`text-sm ${
              message.kind === 'ok' ? 'text-green-600' : 'text-brand-red'
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || name.trim() === initialName.trim()}
          className="inline-flex items-center justify-center rounded-lg bg-brand-gold px-5 py-2 text-sm font-semibold text-white hover:bg-brand-gold-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? t('saving') : t('saveButton')}
        </button>
      </form>
    </Card>
  )
}

function PasswordSection() {
  const t = useTranslations('dashboard.settings.password')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<
    { kind: 'ok' | 'err'; text: string } | null
  >(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (next.length < 8) {
      setMessage({ kind: 'err', text: t('tooShort') })
      return
    }
    if (next !== confirm) {
      setMessage({ kind: 'err', text: t('mismatch') })
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
        setMessage({
          kind: 'err',
          text: json.error || t('changeFailed'),
        })
      } else {
        setMessage({ kind: 'ok', text: t('updated') })
        setCurrent('')
        setNext('')
        setConfirm('')
      }
    } catch {
      setMessage({ kind: 'err', text: t('network') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-brand-text">{t('title')}</h2>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Field label={t('currentLabel')}>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-text focus:border-brand-gold focus:outline-none"
          />
        </Field>
        <Field label={t('newLabel')}>
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            className="w-full rounded-lg border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-text focus:border-brand-gold focus:outline-none"
          />
          <p className="mt-1 text-xs text-brand-muted">{t('newHint')}</p>
        </Field>
        <Field label={t('confirmLabel')}>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            className="w-full rounded-lg border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-text focus:border-brand-gold focus:outline-none"
          />
        </Field>

        {message && (
          <p
            className={`text-sm ${
              message.kind === 'ok' ? 'text-green-600' : 'text-brand-red'
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !current || !next || !confirm}
          className="inline-flex items-center justify-center rounded-lg bg-brand-gold px-5 py-2 text-sm font-semibold text-white hover:bg-brand-gold-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? t('saving') : t('changeButton')}
        </button>
      </form>
    </Card>
  )
}

function DeleteAccountSection() {
  const t = useTranslations('dashboard.settings.delete')
  const [showModal, setShowModal] = useState(false)

  return (
    <Card>
      <h2 className="text-lg font-semibold text-brand-text">{t('title')}</h2>
      <p className="mt-2 text-sm text-brand-muted">{t('hint')}</p>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="mt-4 inline-flex items-center justify-center rounded-lg border border-brand-red px-5 py-2 text-sm font-semibold text-brand-red hover:bg-brand-red hover:text-white"
      >
        {t('button')}
      </button>

      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-brand-white p-6 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-brand-text">
              {t('modalTitle')}
            </h3>
            <p className="mt-3 text-sm text-brand-text">
              {t.rich('modalBody', {
                email: (chunks) => (
                  <a
                    href="mailto:contact@deutschtest.pro"
                    className="font-semibold text-brand-gold hover:text-brand-gold-dark"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </p>
            <p className="mt-2 text-xs text-brand-muted">{t('modalHint')}</p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-brand-border bg-brand-white px-4 py-2 text-sm font-semibold text-brand-text hover:bg-brand-surface"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-brand-muted">
        {label}
      </span>
      {children}
    </label>
  )
}
