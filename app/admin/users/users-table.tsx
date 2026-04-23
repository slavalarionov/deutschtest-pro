'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { UserFilters } from '@/lib/admin/user-filters'
import { StatusChip } from '@/components/admin/StatusChip'
import { Modal, ModalField } from '@/components/admin/Modal'

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
      {/* Filters */}
      <div className="rounded-rad border border-line bg-surface p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <FilterCard label="Поиск (email prefix)">
            <input
              type="text"
              defaultValue={filters.q ?? ''}
              onKeyDown={(e) => {
                if (e.key === 'Enter') updateFilter('q', (e.target as HTMLInputElement).value)
              }}
              onBlur={(e) => {
                if ((filters.q ?? '') !== e.target.value) updateFilter('q', e.target.value)
              }}
              placeholder="напр., mari"
              className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
            />
          </FilterCard>
          <FilterCard label="Роль">
            <FilterSelect
              value={filters.role ?? 'all'}
              onChange={(v) => updateFilter('role', v as UserFilters['role'])}
              options={[
                { value: 'all', label: 'Все' },
                { value: 'admin', label: 'Админы' },
                { value: 'regular', label: 'Обычные' },
              ]}
            />
          </FilterCard>
          <FilterCard label="Статус">
            <FilterSelect
              value={filters.status ?? 'all'}
              onChange={(v) => updateFilter('status', v as UserFilters['status'])}
              options={[
                { value: 'all', label: 'Все' },
                { value: 'active', label: 'Active' },
                { value: 'blocked', label: 'Blocked' },
                { value: 'unlimited', label: 'Unlimited' },
              ]}
            />
          </FilterCard>
          <FilterCard label="Баланс">
            <FilterSelect
              value={filters.balance ?? 'all'}
              onChange={(v) => updateFilter('balance', v as UserFilters['balance'])}
              options={[
                { value: 'all', label: 'Все' },
                { value: 'has', label: 'Есть баланс' },
                { value: 'zero', label: 'Нулевой' },
              ]}
            />
          </FilterCard>
          <FilterCard label="Регистрация">
            <FilterSelect
              value={filters.created ?? 'all'}
              onChange={(v) => updateFilter('created', v as UserFilters['created'])}
              options={[
                { value: 'all', label: 'Всё' },
                { value: 'today', label: 'Сегодня' },
                { value: '7d', label: 'Последние 7д' },
                { value: '30d', label: 'Последние 30д' },
              ]}
            />
          </FilterCard>
        </div>
        <div className="mt-4 flex justify-end">
          {filters.test === '1' ? (
            <button
              onClick={() => updateFilter('test', undefined)}
              className="inline-flex items-center rounded-rad-pill bg-ink px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider text-page hover:bg-ink/90"
            >
              Только тестовые · снять
            </button>
          ) : (
            <button
              onClick={() => updateFilter('test', '1')}
              className="inline-flex items-center rounded-rad-pill border border-line px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-soft transition-colors hover:border-ink hover:text-ink"
            >
              Только тестовые
            </button>
          )}
        </div>
      </div>

      {/* Bulk toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-rad border border-line bg-card px-5 py-3">
        <div className="text-sm text-ink-soft">
          Выбрано:{' '}
          <span className="font-mono text-ink tabular-nums">{selectedCount}</span>
          {selectedCount > 0 && (
            <button
              onClick={clearSelection}
              className="ml-3 text-xs text-muted underline underline-offset-4 hover:text-ink"
            >
              сбросить
            </button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={selectAllMatching}
            disabled={totalMatching === 0}
            className="inline-flex items-center rounded-rad-pill border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            Выбрать всех по фильтру ({totalMatching})
          </button>
          <button
            onClick={() => setBulkGrantOpen(true)}
            disabled={selectedCount === 0}
            className="inline-flex items-center rounded-rad-pill bg-ink px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider text-page transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Начислить модули
          </button>
          <button
            onClick={() => setBulkDeleteOpen(true)}
            disabled={selectedCount === 0}
            className="inline-flex items-center rounded-rad-pill border border-error px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider text-error transition-colors hover:bg-error-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            Удалить
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-rad border border-line bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="border-b border-line bg-surface">
              <tr className="font-mono text-[10px] uppercase tracking-widest text-muted">
                <th className="w-10 px-4 py-3 text-left font-normal">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={(e) => toggleSelectAllOnPage(e.target.checked)}
                    aria-label="Выбрать всех на странице"
                  />
                </th>
                <th className="px-4 py-3 text-left font-normal">Email</th>
                <th className="px-4 py-3 text-left font-normal">Имя</th>
                <th className="px-4 py-3 text-left font-normal">Регистрация</th>
                <th className="px-4 py-3 text-left font-normal">Last active</th>
                <th className="px-4 py-3 text-right font-normal">Баланс</th>
                <th className="px-4 py-3 text-right font-normal">Попыток</th>
                <th className="px-4 py-3 text-left font-normal">Флаги</th>
                <th className="px-4 py-3 font-normal" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center font-mono text-xs text-muted">
                    Пользователей по фильтру нет.
                  </td>
                </tr>
              ) : (
                rows.map((u) => (
                  <tr
                    key={u.id}
                    className={`border-b border-line-soft transition-colors last:border-0 ${
                      selected.has(u.id) ? 'bg-accent-soft' : 'hover:bg-surface/50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={(e) => togglePick(u.id, e.target.checked)}
                        aria-label={`Выбрать ${u.email}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink">
                      {u.email}
                      {u.id === currentAdminId && (
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-accent-ink">
                          вы
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink">{u.displayName ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-muted">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-muted">
                      {formatDate(u.lastSignInAt)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-ink">
                      {u.modulesBalance}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-ink">
                      {u.attemptsCount}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.isAdmin && <StatusChip variant="admin">admin</StatusChip>}
                        {u.isUnlimited && <StatusChip variant="unlimited">unlimited</StatusChip>}
                        {u.isBlocked && <StatusChip variant="blocked">blocked</StatusChip>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-xs text-ink-soft underline underline-offset-4 hover:text-ink"
                      >
                        Открыть
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between font-mono text-xs tabular-nums text-muted">
        <div>
          Страница: {rows.length} строк · Всего: {totalMatching}
        </div>
        <div className="flex items-center gap-2">
          {filters.cursor && (
            <button
              onClick={clearCursor}
              disabled={pending}
              className="inline-flex items-center rounded-rad-pill border border-line px-3 py-1.5 uppercase tracking-wider text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
            >
              В начало
            </button>
          )}
          <button
            onClick={gotoNext}
            disabled={!nextCursor || pending}
            className="inline-flex items-center rounded-rad-pill border border-line px-3 py-1.5 uppercase tracking-wider text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            Следующая
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

function FilterCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-rad-sm border border-line bg-card px-3 py-2 transition-colors focus-within:border-ink">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </div>
      {children}
    </div>
  )
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent text-sm text-ink focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
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
      <ModalField label="Количество модулей">
        <input
          type="number"
          min={1}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          className="w-full bg-transparent text-sm text-ink focus:outline-none"
        />
      </ModalField>
      <ModalField label="Причина (для аудита)">
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full bg-transparent text-sm text-ink focus:outline-none"
        />
      </ModalField>
      <details className="text-sm">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-muted">
          Показать emails
        </summary>
        <ul className="mt-2 max-h-40 space-y-0.5 overflow-auto font-mono text-[11px] text-ink-soft">
          {users.map((u) => (
            <li key={u.id}>{u.email}</li>
          ))}
        </ul>
      </details>
      {error && <div className="text-sm text-error">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onClose}
          disabled={saving}
          className="inline-flex items-center rounded-rad-pill border border-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
        >
          Отмена
        </button>
        <button
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
      <p className="text-sm text-ink-soft">
        Удаление <strong className="text-ink">необратимо</strong>. Каскадно удалятся сессии,
        попытки, ledger. В <code className="font-mono text-xs">deleted_users_audit</code>{' '}
        остаётся след.
      </p>
      {skipped > 0 && (
        <div className="rounded-rad-sm border border-line bg-accent-soft px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-accent-ink">
            Hinweis
          </div>
          <p className="mt-1 text-sm text-accent-ink">
            {skipped} из выбранных — админы или вы сами, они будут пропущены.
          </p>
        </div>
      )}
      <div className="max-h-48 overflow-auto rounded-rad-sm border border-line bg-surface p-3">
        <ul className="space-y-1 font-mono text-[11px] text-ink-soft">
          {deletable.map((u) => (
            <li key={u.id}>
              {u.email}{' '}
              <span className="text-muted">({u.attemptsCount} попыток)</span>
            </li>
          ))}
          {deletable.length === 0 && <li className="text-muted">(ни одного удаляемого)</li>}
        </ul>
      </div>
      <ModalField
        label={`Введите количество удаляемых пользователей (${deletable.length}) для подтверждения`}
      >
        <input
          type="text"
          value={confirmCount}
          onChange={(e) => setConfirmCount(e.target.value)}
          placeholder={String(deletable.length)}
          className="w-full bg-transparent text-sm text-ink focus:outline-none"
        />
      </ModalField>
      {error && <div className="text-sm text-error">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onClose}
          disabled={saving}
          className="inline-flex items-center rounded-rad-pill border border-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
        >
          Отмена
        </button>
        <button
          onClick={submit}
          disabled={saving || deletable.length === 0}
          className="inline-flex items-center rounded-rad-pill bg-error px-5 py-2 text-sm font-medium text-card transition-colors hover:bg-error/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Удаляем…' : `Удалить ${deletable.length}`}
        </button>
      </div>
    </Modal>
  )
}

export { formatDateTime }
