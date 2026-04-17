'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { UserFilters } from '@/lib/admin/user-filters'

export interface UserRow {
  id: string
  email: string
  displayName: string | null
  createdAt: string
  lastSignInAt: string | null
  modulesBalance: number
  isAdmin: boolean
  isUnlimited: boolean
  isBlocked: boolean
  attemptsCount: number
}

interface Props {
  rows: UserRow[]
  totalMatching: number
  nextCursor: string | null
  filters: UserFilters
  currentAdminId: string
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatDateTime(iso: string | null): string {
  if (!iso) return 'никогда'
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function UsersTable({ rows, totalMatching, nextCursor, filters, currentAdminId }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkGrantOpen, setBulkGrantOpen] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const selectedCount = selected.size
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))

  const selectedUsers = useMemo(
    () => rows.filter((r) => selected.has(r.id)),
    [rows, selected]
  )

  function updateFilter<K extends keyof UserFilters>(key: K, value: UserFilters[K] | undefined | '') {
    const params = new URLSearchParams()
    const next: Record<string, string | undefined> = {
      ...(filters as Record<string, string | undefined>),
      [key]: value || undefined,
      cursor: undefined,
    }
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, String(v))
    }
    router.push(`/admin/users${params.toString() ? `?${params}` : ''}`)
  }

  function gotoNext() {
    if (!nextCursor) return
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(filters)) {
      if (v) params.set(k, String(v))
    }
    params.set('cursor', nextCursor)
    router.push(`/admin/users?${params.toString()}`)
  }

  function clearCursor() {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(filters)) {
      if (k === 'cursor') continue
      if (v) params.set(k, String(v))
    }
    router.push(`/admin/users${params.toString() ? `?${params}` : ''}`)
  }

  function togglePick(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleSelectAllOnPage(on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) rows.forEach((r) => next.add(r.id))
      else rows.forEach((r) => next.delete(r.id))
      return next
    })
  }

  async function selectAllMatching() {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(filters)) {
      if (k === 'cursor') continue
      if (v) params.set(k, String(v))
    }
    params.set('ids_only', '1')
    params.set('limit', '1000')
    const res = await fetch(`/api/admin/users?${params.toString()}`)
    if (!res.ok) {
      alert(`Не удалось получить список ID: HTTP ${res.status}`)
      return
    }
    const j = (await res.json()) as { ids?: string[] }
    if (!j.ids) return
    setSelected(new Set(j.ids))
  }

  function clearSelection() {
    setSelected(new Set())
  }

  function refreshAfterMutation() {
    setSelected(new Set())
    setBulkGrantOpen(false)
    setBulkDeleteOpen(false)
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <div className="flex flex-wrap items-end gap-3 p-4 rounded-md border border-[#E0DDD6] bg-white">
        <label className="flex flex-col gap-1 text-xs text-[#6B6560] flex-1 min-w-[180px]">
          <span>Поиск по email (prefix)</span>
          <input
            type="text"
            defaultValue={filters.q ?? ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter') updateFilter('q', (e.target as HTMLInputElement).value)
            }}
            onBlur={(e) => {
              if ((filters.q ?? '') !== e.target.value) updateFilter('q', e.target.value)
            }}
            placeholder="например, mari"
            className="border border-[#E0DDD6] rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8A84B]"
          />
        </label>
        <FilterSelect
          label="Роль"
          value={filters.role ?? 'all'}
          onChange={(v) => updateFilter('role', v as UserFilters['role'])}
          options={[
            { value: 'all', label: 'Все' },
            { value: 'admin', label: 'Админы' },
            { value: 'regular', label: 'Обычные' },
          ]}
        />
        <FilterSelect
          label="Статус"
          value={filters.status ?? 'all'}
          onChange={(v) => updateFilter('status', v as UserFilters['status'])}
          options={[
            { value: 'all', label: 'Все' },
            { value: 'active', label: 'Active' },
            { value: 'blocked', label: 'Blocked' },
            { value: 'unlimited', label: 'Unlimited' },
          ]}
        />
        <FilterSelect
          label="Баланс"
          value={filters.balance ?? 'all'}
          onChange={(v) => updateFilter('balance', v as UserFilters['balance'])}
          options={[
            { value: 'all', label: 'Все' },
            { value: 'has', label: 'Есть баланс' },
            { value: 'zero', label: 'Нулевой' },
          ]}
        />
        <FilterSelect
          label="Дата регистрации"
          value={filters.created ?? 'all'}
          onChange={(v) => updateFilter('created', v as UserFilters['created'])}
          options={[
            { value: 'all', label: 'Всё' },
            { value: 'today', label: 'Сегодня' },
            { value: '7d', label: 'Последние 7д' },
            { value: '30d', label: 'Последние 30д' },
          ]}
        />
        {filters.test === '1' ? (
          <button
            onClick={() => updateFilter('test', undefined)}
            className="text-xs text-[#8B1A1A] border border-[#8B1A1A] rounded-md px-3 py-1.5 bg-white hover:bg-red-50"
          >
            Тестовые × снять
          </button>
        ) : (
          <button
            onClick={() => updateFilter('test', '1')}
            className="text-xs text-[#6B6560] border border-[#E0DDD6] rounded-md px-3 py-1.5 bg-white hover:bg-[#F2EFE8]"
          >
            🧪 Только тестовые
          </button>
        )}
      </div>

      {/* Bulk-toolbar. Всегда виден, кнопки disabled при 0 выбранных. */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-md border border-[#E0DDD6] bg-[#F2EFE8]">
        <div className="text-sm text-[#1A1A1A]">
          Выбрано: <span className="font-medium">{selectedCount}</span>
          {selectedCount > 0 && (
            <button onClick={clearSelection} className="ml-2 text-xs text-[#6B6560] underline">
              сбросить
            </button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={selectAllMatching}
            disabled={totalMatching === 0}
            className="text-xs text-[#1A1A1A] border border-[#E0DDD6] rounded-md px-3 py-1.5 bg-white hover:bg-[#E0DDD6] disabled:opacity-40"
          >
            Выбрать всех по фильтру ({totalMatching})
          </button>
          <button
            onClick={() => setBulkGrantOpen(true)}
            disabled={selectedCount === 0}
            className="text-xs text-white bg-[#1A1A1A] rounded-md px-3 py-1.5 hover:bg-[#3A3A3A] disabled:opacity-40"
          >
            + Начислить модули
          </button>
          <button
            onClick={() => setBulkDeleteOpen(true)}
            disabled={selectedCount === 0}
            className="text-xs text-white bg-[#8B1A1A] rounded-md px-3 py-1.5 hover:bg-red-900 disabled:opacity-40"
          >
            Удалить
          </button>
        </div>
      </div>

      {/* Таблица */}
      <div className="border border-[#E0DDD6] rounded-md bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#F2EFE8] text-[#6B6560] text-xs uppercase tracking-wide">
            <tr>
              <th className="w-10 px-3 py-2 text-left">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={(e) => toggleSelectAllOnPage(e.target.checked)}
                  aria-label="Выбрать всех на странице"
                />
              </th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Имя</th>
              <th className="px-3 py-2 text-left">Регистрация</th>
              <th className="px-3 py-2 text-left">Last active</th>
              <th className="px-3 py-2 text-right">Баланс</th>
              <th className="px-3 py-2 text-right">Попыток</th>
              <th className="px-3 py-2 text-left">Флаги</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E0DDD6]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-[#6B6560]">
                  Пользователей по фильтру нет.
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className={selected.has(u.id) ? 'bg-[#FAF4DD]' : ''}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={(e) => togglePick(u.id, e.target.checked)}
                      aria-label={`Выбрать ${u.email}`}
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-[#1A1A1A]">
                    {u.email}
                    {u.id === currentAdminId && (
                      <span className="ml-2 text-[10px] text-[#C8A84B] normal-case">(вы)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[#1A1A1A]">{u.displayName ?? '—'}</td>
                  <td className="px-3 py-2 text-[#6B6560]">{formatDate(u.createdAt)}</td>
                  <td className="px-3 py-2 text-[#6B6560]">{formatDate(u.lastSignInAt)}</td>
                  <td className="px-3 py-2 text-right font-medium text-[#1A1A1A]">
                    {u.modulesBalance}
                  </td>
                  <td className="px-3 py-2 text-right text-[#1A1A1A]">{u.attemptsCount}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {u.isAdmin && <Badge color="gold">admin</Badge>}
                      {u.isUnlimited && <Badge color="blue">unlimited</Badge>}
                      {u.isBlocked && <Badge color="red">blocked</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-xs text-[#C8A84B] hover:text-[#1A1A1A]"
                    >
                      Открыть →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      <div className="flex items-center justify-between text-xs text-[#6B6560]">
        <div>
          Страница: {rows.length} строк. Всего: {totalMatching}.
        </div>
        <div className="flex items-center gap-2">
          {filters.cursor && (
            <button
              onClick={clearCursor}
              className="px-3 py-1.5 border border-[#E0DDD6] rounded-md bg-white hover:bg-[#F2EFE8]"
              disabled={pending}
            >
              ← В начало
            </button>
          )}
          <button
            onClick={gotoNext}
            disabled={!nextCursor || pending}
            className="px-3 py-1.5 border border-[#E0DDD6] rounded-md bg-white hover:bg-[#F2EFE8] disabled:opacity-40"
          >
            Следующая →
          </button>
        </div>
      </div>

      {bulkGrantOpen && (
        <BulkGrantModal
          users={selectedUsers}
          onClose={() => setBulkGrantOpen(false)}
          onDone={refreshAfterMutation}
        />
      )}
      {bulkDeleteOpen && (
        <BulkDeleteModal
          users={selectedUsers}
          currentAdminId={currentAdminId}
          onClose={() => setBulkDeleteOpen(false)}
          onDone={refreshAfterMutation}
        />
      )}
    </div>
  )
}

function Badge({
  children,
  color,
}: {
  children: React.ReactNode
  color: 'gold' | 'red' | 'blue'
}) {
  const palette =
    color === 'gold'
      ? 'bg-[#FAF4DD] text-[#9E7E2C] border-[#E6D8A8]'
      : color === 'red'
        ? 'bg-red-50 text-[#8B1A1A] border-red-200'
        : 'bg-blue-50 text-blue-800 border-blue-200'
  return (
    <span className={`text-[10px] uppercase tracking-wide border rounded-sm px-1.5 py-0.5 ${palette}`}>
      {children}
    </span>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-[#6B6560]">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-[#E0DDD6] rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8A84B]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function BulkGrantModal({
  users,
  onClose,
  onDone,
}: {
  users: UserRow[]
  onClose: () => void
  onDone: () => void
}) {
  const [count, setCount] = useState<string>('1')
  const [reason, setReason] = useState<string>('admin_bulk_grant')
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
    const res = await fetch('/api/admin/users/bulk-grant-modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_ids: users.map((u) => u.id),
        count: n,
        reason: reason.trim(),
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      setError(j.error ?? `HTTP ${res.status}`)
      return
    }
    const j = (await res.json()) as { granted: number }
    alert(`Начислено +${n} модулей для ${j.granted} юзеров.`)
    onDone()
  }

  return (
    <Modal onClose={onClose} title={`Начислить модули (${users.length} юзеров)`}>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[#6B6560]">Количество модулей</span>
        <input
          type="number"
          min={1}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          className="border border-[#E0DDD6] rounded-md px-3 py-1.5 bg-white"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[#6B6560]">Причина (для аудита)</span>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="border border-[#E0DDD6] rounded-md px-3 py-1.5 bg-white"
        />
      </label>
      <details className="text-xs">
        <summary className="cursor-pointer text-[#6B6560]">Показать emails</summary>
        <ul className="mt-2 max-h-40 overflow-auto space-y-0.5 font-mono text-[11px] text-[#6B6560]">
          {users.map((u) => (
            <li key={u.id}>{u.email}</li>
          ))}
        </ul>
      </details>
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

function BulkDeleteModal({
  users,
  currentAdminId,
  onClose,
  onDone,
}: {
  users: UserRow[]
  currentAdminId: string
  onClose: () => void
  onDone: () => void
}) {
  const deletable = users.filter((u) => u.id !== currentAdminId && !u.isAdmin)
  const skipped = users.length - deletable.length

  const [confirmCount, setConfirmCount] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    if (Number(confirmCount) !== deletable.length) {
      setError(`Нужно ввести точно ${deletable.length} для подтверждения.`)
      return
    }
    if (deletable.length === 0) {
      setError('Нечего удалять: все выбранные — админы или вы сами.')
      return
    }
    if (deletable.length > 100) {
      setError('Лимит bulk-delete — 100 юзеров за раз.')
      return
    }
    setSaving(true)
    const res = await fetch('/api/admin/users/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_ids: deletable.map((u) => u.id) }),
    })
    setSaving(false)
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      setError(j.error ?? `HTTP ${res.status}`)
      return
    }
    const j = (await res.json()) as {
      deleted: number
      skipped: Array<{ id: string; reason: string }>
    }
    const skippedMsg = j.skipped.length > 0 ? `\nПропущено: ${j.skipped.length}.` : ''
    alert(`Удалено: ${j.deleted}.${skippedMsg}`)
    onDone()
  }

  return (
    <Modal onClose={onClose} title={`Удалить ${deletable.length} пользователей?`}>
      <p className="text-sm text-[#1A1A1A]">
        Удаление <strong>необратимо</strong>. Каскадно удалятся сессии, попытки, ledger.
        В <code>deleted_users_audit</code> остаётся след.
      </p>
      {skipped > 0 && (
        <p className="text-xs text-[#C8A84B]">
          ⚠ {skipped} из выбранных — админы или вы сами, они будут пропущены.
        </p>
      )}
      <div className="max-h-48 overflow-auto border border-[#E0DDD6] rounded-md bg-[#FAFAF7] p-3">
        <ul className="space-y-1 font-mono text-[11px] text-[#6B6560]">
          {deletable.map((u) => (
            <li key={u.id}>
              {u.email} <span className="text-[#6B6560]/70">({u.attemptsCount} попыток)</span>
            </li>
          ))}
          {deletable.length === 0 && <li>(ни одного удаляемого)</li>}
        </ul>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[#6B6560]">
          Введите количество удаляемых пользователей ({deletable.length}) для подтверждения
        </span>
        <input
          type="text"
          value={confirmCount}
          onChange={(e) => setConfirmCount(e.target.value)}
          className="border border-[#E0DDD6] rounded-md px-3 py-1.5 bg-white"
          placeholder={String(deletable.length)}
        />
      </label>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="text-sm text-[#6B6560]" disabled={saving}>
          Отмена
        </button>
        <button
          onClick={submit}
          disabled={saving || deletable.length === 0}
          className="px-4 py-2 bg-[#8B1A1A] text-white rounded-md text-sm hover:bg-red-900 disabled:opacity-40"
        >
          {saving ? 'Удаляем…' : `Удалить ${deletable.length}`}
        </button>
      </div>
    </Modal>
  )
}

export function Modal({
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

// formatDateTime пригодится в детальной карточке — экспортируем.
export { formatDateTime }
