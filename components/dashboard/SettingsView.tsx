'use client'

import { useState } from 'react'

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
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Einstellungen</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Profil, Passwort und Konto verwalten.
        </p>
      </div>

      <ProfileSection email={email} initialName={initialName} />

      {canChangePassword ? (
        <PasswordSection />
      ) : (
        <Card>
          <h2 className="text-lg font-semibold text-brand-text">Passwort</h2>
          <p className="mt-2 text-sm text-brand-muted">
            Sie haben sich über einen externen Anbieter (z. B. Google)
            angemeldet. Das Passwort wird beim Anbieter verwaltet.
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
          text: json.error || 'Speichern fehlgeschlagen.',
        })
      } else {
        setMessage({ kind: 'ok', text: 'Name gespeichert.' })
      }
    } catch {
      setMessage({ kind: 'err', text: 'Netzwerkfehler.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-brand-text">Profil</h2>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Field label="E-Mail">
          <input
            type="email"
            value={email}
            readOnly
            className="w-full cursor-not-allowed rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-muted"
          />
          <p className="mt-1 text-xs text-brand-muted">
            E-Mail kann derzeit nicht geändert werden.
          </p>
        </Field>

        <Field label="Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Wie sollen wir Sie nennen?"
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
          {saving ? 'Wird gespeichert…' : 'Speichern'}
        </button>
      </form>
    </Card>
  )
}

function PasswordSection() {
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
      setMessage({
        kind: 'err',
        text: 'Neues Passwort muss mindestens 8 Zeichen lang sein.',
      })
      return
    }
    if (next !== confirm) {
      setMessage({ kind: 'err', text: 'Passwörter stimmen nicht überein.' })
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
          text: json.error || 'Passwort konnte nicht geändert werden.',
        })
      } else {
        setMessage({ kind: 'ok', text: 'Passwort wurde aktualisiert.' })
        setCurrent('')
        setNext('')
        setConfirm('')
      }
    } catch {
      setMessage({ kind: 'err', text: 'Netzwerkfehler.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-brand-text">
        Passwort ändern
      </h2>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Field label="Aktuelles Passwort">
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-text focus:border-brand-gold focus:outline-none"
          />
        </Field>
        <Field label="Neues Passwort">
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            className="w-full rounded-lg border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-text focus:border-brand-gold focus:outline-none"
          />
          <p className="mt-1 text-xs text-brand-muted">
            Mindestens 8 Zeichen.
          </p>
        </Field>
        <Field label="Neues Passwort bestätigen">
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
          {saving ? 'Wird gespeichert…' : 'Passwort ändern'}
        </button>
      </form>
    </Card>
  )
}

function DeleteAccountSection() {
  const [showModal, setShowModal] = useState(false)

  return (
    <Card>
      <h2 className="text-lg font-semibold text-brand-text">Konto löschen</h2>
      <p className="mt-2 text-sm text-brand-muted">
        Ihr Konto und alle zugehörigen Daten werden dauerhaft entfernt.
      </p>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="mt-4 inline-flex items-center justify-center rounded-lg border border-brand-red px-5 py-2 text-sm font-semibold text-brand-red hover:bg-brand-red hover:text-white"
      >
        Konto löschen
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
              Konto löschen
            </h3>
            <p className="mt-3 text-sm text-brand-text">
              Bitte kontaktieren Sie uns unter{' '}
              <a
                href="mailto:contact@deutschtest.pro"
                className="font-semibold text-brand-gold hover:text-brand-gold-dark"
              >
                contact@deutschtest.pro
              </a>
              , um Ihr Konto zu löschen.
            </p>
            <p className="mt-2 text-xs text-brand-muted">
              Wir bestätigen die Löschung manuell, um versehentliche Anfragen
              zu vermeiden.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-brand-border bg-brand-white px-4 py-2 text-sm font-semibold text-brand-text hover:bg-brand-surface"
              >
                Schließen
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
