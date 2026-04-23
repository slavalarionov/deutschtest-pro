'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal, ModalField } from '../users-table'

interface UserForActions {
  id: string
  email: string
  isAdmin: boolean
  isUnlimited: boolean
  isBlocked: boolean
  modulesBalance: number
}

interface Props {
  user: UserForActions
  isSelf: boolean
  totalAdmins: number
}

type ModalId = 'grant' | 'toggle-admin' | 'toggle-unlimited' | 'toggle-blocked' | 'delete' | null

export function UserActions({ user, isSelf, totalAdmins }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [modal, setModal] = useState<ModalId>(null)

  function refresh() {
    setModal(null)
    startTransition(() => router.refresh())
  }

  // no-self-delete, no-admin-delete (admin flag must be removed first)
  const canDelete = !isSelf && !user.isAdmin
  const deleteTooltip = isSelf
    ? 'Нельзя удалить самого себя.'
    : user.isAdmin
      ? 'Сначала снимите флаг admin.'
      : ''

  // no-last-admin: cannot remove is_admin from the only admin
  const canToggleAdmin = !(user.isAdmin && totalAdmins <= 1) && !(user.isAdmin && isSelf)
  const adminTooltip = user.isAdmin && totalAdmins <= 1
    ? 'Нельзя снять флаг — это единственный админ.'
    : user.isAdmin && isSelf
      ? 'Нельзя снять admin у себя.'
      : ''

  return (
    <section className="rounded-rad border border-line bg-card p-5">
      <div className="flex flex-wrap gap-2">
        <ActionButton onClick={() => setModal('grant')}>Начислить модули</ActionButton>
        <ActionButton
          onClick={() => setModal('toggle-admin')}
          disabled={!canToggleAdmin}
          title={adminTooltip}
        >
          {user.isAdmin ? 'Снять admin' : 'Сделать admin'}
        </ActionButton>
        <ActionButton onClick={() => setModal('toggle-unlimited')}>
          {user.isUnlimited ? 'Снять unlimited' : 'Сделать unlimited'}
        </ActionButton>
        <ActionButton onClick={() => setModal('toggle-blocked')}>
          {user.isBlocked ? 'Разблокировать' : 'Заблокировать'}
        </ActionButton>
        <div className="ml-auto" />
        <button
          type="button"
          onClick={() => setModal('delete')}
          disabled={!canDelete}
          title={deleteTooltip}
          className="inline-flex items-center rounded-rad-pill border border-error px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-error-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          Удалить пользователя
        </button>
      </div>

      {modal === 'grant' && (
        <GrantModal user={user} onClose={() => setModal(null)} onDone={refresh} />
      )}
      {modal === 'toggle-admin' && (
        <ToggleModal
          user={user}
          field="admin"
          onClose={() => setModal(null)}
          onDone={refresh}
        />
      )}
      {modal === 'toggle-unlimited' && (
        <ToggleModal
          user={user}
          field="unlimited"
          onClose={() => setModal(null)}
          onDone={refresh}
        />
      )}
      {modal === 'toggle-blocked' && (
        <ToggleModal
          user={user}
          field="blocked"
          onClose={() => setModal(null)}
          onDone={refresh}
        />
      )}
      {modal === 'delete' && (
        <DeleteModal user={user} onClose={() => setModal(null)} onDone={refresh} />
      )}
    </section>
  )
}

function ActionButton({
  onClick,
  children,
  disabled,
  title,
}: {
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center rounded-rad-pill border border-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function GrantModal({
  user,
  onClose,
  onDone,
}: {
  user: UserForActions
  onClose: () => void
  onDone: () => void
}) {
  const [count, setCount] = useState('1')
  const [reason, setReason] = useState('admin_grant')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    const n = Number(count)
    if (!Number.isInteger(n) || n <= 0) {
      setError('Количество — целое число > 0.')
      return
    }
    if (!reason.trim()) {
      setError('Причина обязательна.')
      return
    }
    setSaving(true)
    const res = await fetch(`/api/admin/users/${user.id}/grant-modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: n, reason: reason.trim() }),
    })
    setSaving(false)
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      setError(j.error ?? `HTTP ${res.status}`)
      return
    }
    onDone()
  }

  return (
    <Modal title={`Начислить модули: ${user.email}`} onClose={onClose}>
      <p className="text-sm text-ink-soft">
        Текущий баланс:{' '}
        <span className="font-mono tabular-nums text-ink">{user.modulesBalance}</span>
      </p>
      <ModalField label="Количество">
        <input
          type="number"
          min={1}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          className="w-full bg-transparent text-sm text-ink focus:outline-none"
        />
      </ModalField>
      <ModalField label="Причина (в modules_ledger.reason)">
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full bg-transparent text-sm text-ink focus:outline-none"
        />
      </ModalField>
      {error && <div className="text-sm text-error">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="inline-flex items-center rounded-rad-pill border border-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center rounded-rad-pill bg-ink px-5 py-2 text-sm font-medium text-page transition-colors hover:bg-ink/90 disabled:opacity-50"
        >
          {saving ? 'Начисляем…' : 'Начислить'}
        </button>
      </div>
    </Modal>
  )
}

function ToggleModal({
  user,
  field,
  onClose,
  onDone,
}: {
  user: UserForActions
  field: 'admin' | 'unlimited' | 'blocked'
  onClose: () => void
  onDone: () => void
}) {
  const current =
    field === 'admin' ? user.isAdmin : field === 'unlimited' ? user.isUnlimited : user.isBlocked
  const nextValue = !current

  const labels: Record<typeof field, string> = {
    admin: 'Admin',
    unlimited: 'Unlimited',
    blocked: 'Blocked',
  }
  const title = `${nextValue ? 'Установить' : 'Снять'} флаг «${labels[field]}»`

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    setSaving(true)
    const res = await fetch(`/api/admin/users/${user.id}/toggle-${field}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: nextValue }),
    })
    setSaving(false)
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      setError(j.error ?? `HTTP ${res.status}`)
      return
    }
    onDone()
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-ink-soft">
        Пользователь: <span className="font-mono text-xs text-ink">{user.email}</span>
      </p>
      <p className="text-sm text-ink-soft">
        Флаг <strong className="text-ink">{labels[field]}</strong> →{' '}
        {nextValue ? 'включить' : 'выключить'}.
      </p>
      {((field === 'admin' && nextValue) || (field === 'blocked' && nextValue)) && (
        <div className="rounded-rad-sm border border-line bg-accent-soft px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-accent-ink">
            Hinweis
          </div>
          <p className="mt-1 text-sm text-accent-ink">
            {field === 'admin'
              ? 'Пользователь получит полный доступ к админ-панели.'
              : 'Заблокированный пользователь не сможет проходить экзамены.'}
          </p>
        </div>
      )}
      {error && <div className="text-sm text-error">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="inline-flex items-center rounded-rad-pill border border-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center rounded-rad-pill bg-ink px-5 py-2 text-sm font-medium text-page transition-colors hover:bg-ink/90 disabled:opacity-50"
        >
          {saving ? 'Сохраняем…' : 'Подтвердить'}
        </button>
      </div>
    </Modal>
  )
}

function DeleteModal({
  user,
  onClose,
  onDone,
}: {
  user: UserForActions
  onClose: () => void
  onDone: () => void
}) {
  const [emailConfirm, setEmailConfirm] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const matches = emailConfirm.trim().toLowerCase() === user.email.toLowerCase()

  async function submit() {
    setError(null)
    if (!matches) {
      setError('Email не совпадает.')
      return
    }
    setSaving(true)
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: note.trim() || undefined }),
    })
    setSaving(false)
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      setError(j.error ?? `HTTP ${res.status}`)
      return
    }
    window.location.href = '/admin/users'
    onDone()
  }

  return (
    <Modal title={`Удалить: ${user.email}?`} onClose={onClose}>
      <p className="text-sm text-ink-soft">
        Удаление <strong className="text-ink">необратимо</strong>. Каскадно удалятся:
      </p>
      <ul className="list-disc list-inside space-y-0.5 text-sm text-ink-soft">
        <li>все сессии экзаменов (exam_sessions)</li>
        <li>все попытки (user_attempts)</li>
        <li>история modules_ledger</li>
        <li>активации промокодов (promo_redemptions)</li>
      </ul>
      <p className="text-sm text-ink-soft">
        В <code className="font-mono text-xs">deleted_users_audit</code> останется снимок
        профиля.
      </p>
      <ModalField
        label={`Введите email ${user.email} для подтверждения`}
      >
        <input
          type="text"
          value={emailConfirm}
          onChange={(e) => setEmailConfirm(e.target.value)}
          className="w-full bg-transparent font-mono text-sm text-ink focus:outline-none"
        />
      </ModalField>
      <ModalField label="Note (опц., в аудит)">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="например, test account cleanup"
          className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
        />
      </ModalField>
      {error && <div className="text-sm text-error">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="inline-flex items-center rounded-rad-pill border border-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving || !matches}
          className="inline-flex items-center rounded-rad-pill bg-error px-5 py-2 text-sm font-medium text-card transition-colors hover:bg-error/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Удаляем…' : 'Удалить'}
        </button>
      </div>
    </Modal>
  )
}
