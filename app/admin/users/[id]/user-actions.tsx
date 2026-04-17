'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

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

type Modal = 'grant' | 'toggle-admin' | 'toggle-unlimited' | 'toggle-blocked' | 'delete' | null

export function UserActions({ user, isSelf, totalAdmins }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [modal, setModal] = useState<Modal>(null)

  function refresh() {
    setModal(null)
    startTransition(() => router.refresh())
  }

  // no-self-delete, no-admin-delete (должен сначала сняться is_admin)
  const canDelete = !isSelf && !user.isAdmin
  const deleteTooltip = isSelf
    ? 'Нельзя удалить самого себя.'
    : user.isAdmin
      ? 'Сначала снимите флаг admin.'
      : ''

  // no-last-admin: нельзя снять is_admin у единственного админа
  const canToggleAdmin = !(user.isAdmin && totalAdmins <= 1) && !(user.isAdmin && isSelf)
  const adminTooltip = user.isAdmin && totalAdmins <= 1
    ? 'Нельзя снять флаг — это единственный админ.'
    : user.isAdmin && isSelf
      ? 'Нельзя снять admin у себя.'
      : ''

  return (
    <section className="border border-[#E0DDD6] rounded-md bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setModal('grant')}
          className="text-sm text-white bg-[#1A1A1A] rounded-md px-4 py-2 hover:bg-[#3A3A3A]"
        >
          + Начислить модули
        </button>
        <button
          onClick={() => setModal('toggle-admin')}
          disabled={!canToggleAdmin}
          title={adminTooltip}
          className="text-sm text-[#1A1A1A] border border-[#E0DDD6] rounded-md px-4 py-2 bg-white hover:bg-[#F2EFE8] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {user.isAdmin ? 'Снять admin' : 'Сделать admin'}
        </button>
        <button
          onClick={() => setModal('toggle-unlimited')}
          className="text-sm text-[#1A1A1A] border border-[#E0DDD6] rounded-md px-4 py-2 bg-white hover:bg-[#F2EFE8]"
        >
          {user.isUnlimited ? 'Снять unlimited' : 'Сделать unlimited'}
        </button>
        <button
          onClick={() => setModal('toggle-blocked')}
          className="text-sm text-[#1A1A1A] border border-[#E0DDD6] rounded-md px-4 py-2 bg-white hover:bg-[#F2EFE8]"
        >
          {user.isBlocked ? 'Разблокировать' : 'Заблокировать'}
        </button>
        <div className="ml-auto" />
        <button
          onClick={() => setModal('delete')}
          disabled={!canDelete}
          title={deleteTooltip}
          className="text-sm text-white bg-[#8B1A1A] rounded-md px-4 py-2 hover:bg-red-900 disabled:opacity-40 disabled:cursor-not-allowed"
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

// ─── Модалки ────────────────────────────────────────────────

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
      <p className="text-sm text-[#6B6560]">
        Текущий баланс: <span className="font-medium text-[#1A1A1A]">{user.modulesBalance}</span>
      </p>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[#6B6560]">Количество</span>
        <input
          type="number"
          min={1}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          className="border border-[#E0DDD6] rounded-md px-3 py-1.5 bg-white"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[#6B6560]">Причина (в modules_ledger.reason)</span>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="border border-[#E0DDD6] rounded-md px-3 py-1.5 bg-white"
        />
      </label>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="text-sm text-[#6B6560]" disabled={saving}>
          Отмена
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="px-4 py-2 bg-[#1A1A1A] text-white rounded-md text-sm disabled:opacity-40"
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
      <p className="text-sm text-[#1A1A1A]">
        Пользователь: <span className="font-mono text-xs">{user.email}</span>
      </p>
      <p className="text-sm text-[#6B6560]">
        Флаг <strong>{labels[field]}</strong> → {nextValue ? 'включить' : 'выключить'}.
      </p>
      {field === 'admin' && nextValue && (
        <p className="text-xs text-[#C8A84B]">
          ⚠ Пользователь получит полный доступ к админ-панели.
        </p>
      )}
      {field === 'blocked' && nextValue && (
        <p className="text-xs text-[#C8A84B]">
          ⚠ Заблокированный пользователь не сможет проходить экзамены.
        </p>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="text-sm text-[#6B6560]" disabled={saving}>
          Отмена
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="px-4 py-2 bg-[#1A1A1A] text-white rounded-md text-sm disabled:opacity-40"
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
    // Успех — уводим обратно в список.
    window.location.href = '/admin/users'
    onDone()
  }

  return (
    <Modal title={`Удалить: ${user.email}?`} onClose={onClose}>
      <p className="text-sm text-[#1A1A1A]">
        Удаление <strong>необратимо</strong>. Каскадно удалятся:
      </p>
      <ul className="list-disc list-inside text-sm text-[#6B6560] space-y-0.5">
        <li>все сессии экзаменов (exam_sessions)</li>
        <li>все попытки (user_attempts)</li>
        <li>история modules_ledger</li>
        <li>активации промокодов (promo_redemptions)</li>
      </ul>
      <p className="text-sm text-[#6B6560]">
        В <code>deleted_users_audit</code> останется снимок профиля.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[#6B6560]">
          Введите email <span className="font-mono text-xs">{user.email}</span> для подтверждения
        </span>
        <input
          type="text"
          value={emailConfirm}
          onChange={(e) => setEmailConfirm(e.target.value)}
          className="border border-[#E0DDD6] rounded-md px-3 py-1.5 bg-white"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[#6B6560]">Note (опц., в аудит)</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="например, test account cleanup"
          className="border border-[#E0DDD6] rounded-md px-3 py-1.5 bg-white"
        />
      </label>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="text-sm text-[#6B6560]" disabled={saving}>
          Отмена
        </button>
        <button
          onClick={submit}
          disabled={saving || !matches}
          className="px-4 py-2 bg-[#8B1A1A] text-white rounded-md text-sm hover:bg-red-900 disabled:opacity-40"
        >
          {saving ? 'Удаляем…' : 'Удалить'}
        </button>
      </div>
    </Modal>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-md border border-[#E0DDD6] w-full max-w-lg max-h-[90vh] overflow-auto">
        <header className="flex items-center justify-between p-4 border-b border-[#E0DDD6]">
          <h3 className="text-lg font-medium text-[#1A1A1A]">{title}</h3>
          <button onClick={onClose} className="text-sm text-[#6B6560] hover:text-[#1A1A1A]">
            ✕
          </button>
        </header>
        <div className="p-4 space-y-3">{children}</div>
      </div>
    </div>
  )
}
