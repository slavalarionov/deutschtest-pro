'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal, ModalField } from '@/components/admin/Modal'
import { formatNative, formatEditorialDate } from '@/lib/economy/formatting'

export interface FixedCostRowDto {
  id: string
  name: string
  amountNative: number
  nativeCurrency: 'USD' | 'RUB' | 'EUR'
  period: 'monthly' | 'yearly' | 'one_time'
  category: 'hosting' | 'database' | 'cdn' | 'email' | 'ai_subscription' | 'domain' | 'other'
  startedAt: string
  endedAt: string | null
  notes: string | null
}

const CATEGORY_OPTIONS: ReadonlyArray<{ id: FixedCostRowDto['category']; label: string }> = [
  { id: 'hosting', label: 'Хостинг' },
  { id: 'database', label: 'База данных' },
  { id: 'cdn', label: 'CDN' },
  { id: 'email', label: 'Email' },
  { id: 'ai_subscription', label: 'AI-подписка' },
  { id: 'domain', label: 'Домен' },
  { id: 'other', label: 'Прочее' },
]

const PERIOD_OPTIONS: ReadonlyArray<{ id: FixedCostRowDto['period']; label: string }> = [
  { id: 'monthly', label: 'Ежемесячно' },
  { id: 'yearly', label: 'Ежегодно' },
  { id: 'one_time', label: 'Разово' },
]

const CURRENCY_OPTIONS: FixedCostRowDto['nativeCurrency'][] = ['USD', 'RUB', 'EUR']

const PERIOD_LABEL: Record<FixedCostRowDto['period'], string> = {
  monthly: 'мес',
  yearly: 'год',
  one_time: 'разово',
}
const CATEGORY_LABEL: Record<FixedCostRowDto['category'], string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((o) => [o.id, o.label])
) as Record<FixedCostRowDto['category'], string>

interface FormState {
  name: string
  amountNative: string
  nativeCurrency: FixedCostRowDto['nativeCurrency']
  period: FixedCostRowDto['period']
  category: FixedCostRowDto['category']
  startedAt: string
  notes: string
}

function emptyForm(): FormState {
  return {
    name: '',
    amountNative: '',
    nativeCurrency: 'USD',
    period: 'monthly',
    category: 'other',
    startedAt: new Date().toISOString().slice(0, 10),
    notes: '',
  }
}

function rowToForm(row: FixedCostRowDto): FormState {
  return {
    name: row.name,
    amountNative: String(row.amountNative),
    nativeCurrency: row.nativeCurrency,
    period: row.period,
    category: row.category,
    startedAt: row.startedAt,
    notes: row.notes ?? '',
  }
}

export function FixedCostsManager({ rows }: { rows: FixedCostRowDto[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<FixedCostRowDto | null>(null)
  const [endingId, setEndingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const activeRows = rows.filter((r) => !r.endedAt || r.endedAt > today)
  const endedRows = rows.filter((r) => r.endedAt && r.endedAt <= today)

  function refresh() {
    setCreateOpen(false)
    setEditingRow(null)
    setError(null)
    startTransition(() => router.refresh())
  }

  async function endRow(id: string) {
    if (!confirm('Завершить этот расход? Запись останется в истории, но выпадет из активных.')) {
      return
    }
    setEndingId(id)
    setError(null)
    const res = await fetch(`/api/admin/economy/fixed-costs/${id}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    setEndingId(null)
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      setError(j.error ?? `HTTP ${res.status}`)
      return
    }
    refresh()
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-rad border border-red-300 bg-red-50 px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted">
          Активных: {activeRows.length} · Завершённых: {endedRows.length}
        </p>
        <button
          type="button"
          onClick={() => {
            setError(null)
            setCreateOpen(true)
          }}
          className="rounded-rad-sm bg-ink px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-page"
        >
          + Добавить расход
        </button>
      </div>

      <div className="overflow-hidden rounded-rad border border-line bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface">
            <tr className="font-mono text-[10px] uppercase tracking-widest text-muted">
              <th className="px-4 py-3 text-left font-normal">Сервис</th>
              <th className="px-4 py-3 text-left font-normal">Категория</th>
              <th className="px-4 py-3 text-right font-normal">Сумма</th>
              <th className="px-4 py-3 text-left font-normal">Период</th>
              <th className="px-4 py-3 text-left font-normal">Активен с</th>
              <th className="px-4 py-3 text-right font-normal">Действия</th>
            </tr>
          </thead>
          <tbody>
            {activeRows.length === 0 && endedRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center font-mono text-xs text-muted">
                  Расходов ещё нет.
                </td>
              </tr>
            )}
            {activeRows.map((row) => (
              <tr key={row.id} className="border-b border-line-soft last:border-0">
                <td className="px-4 py-3 text-ink">
                  <div>{row.name}</div>
                  {row.notes && <div className="mt-0.5 text-xs text-muted">{row.notes}</div>}
                </td>
                <td className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted">
                  {CATEGORY_LABEL[row.category]}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-ink">
                  {formatNative(row.amountNative, row.nativeCurrency)}
                </td>
                <td className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted">
                  {PERIOD_LABEL[row.period]}
                </td>
                <td className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted">
                  {formatEditorialDate(row.startedAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null)
                        setEditingRow(row)
                      }}
                      className="rounded-rad-sm border border-line px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-page"
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => endRow(row.id)}
                      disabled={endingId === row.id}
                      className="rounded-rad-sm border border-line px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-muted transition-colors hover:text-red-600 disabled:opacity-50"
                    >
                      {endingId === row.id ? 'Завершаю…' : 'Завершить'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {endedRows.map((row) => (
              <tr key={row.id} className="border-b border-line-soft bg-surface/30 text-muted last:border-0">
                <td className="px-4 py-3">
                  <div>{row.name}</div>
                  {row.endedAt && (
                    <div className="mt-0.5 font-mono text-[11px] uppercase tracking-wider">
                      завершён {formatEditorialDate(row.endedAt)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs uppercase tracking-wider">
                  {CATEGORY_LABEL[row.category]}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm tabular-nums">
                  {formatNative(row.amountNative, row.nativeCurrency)}
                </td>
                <td className="px-4 py-3 font-mono text-xs uppercase tracking-wider">
                  {PERIOD_LABEL[row.period]}
                </td>
                <td className="px-4 py-3 font-mono text-xs uppercase tracking-wider">
                  {formatEditorialDate(row.startedAt)}
                </td>
                <td className="px-4 py-3" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <FixedCostFormModal
          title="Новый постоянный расход"
          initial={emptyForm()}
          onCancel={() => setCreateOpen(false)}
          onSubmit={async (form) => {
            const res = await fetch('/api/admin/economy/fixed-costs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: form.name,
                amountNative: Number(form.amountNative),
                nativeCurrency: form.nativeCurrency,
                period: form.period,
                category: form.category,
                startedAt: form.startedAt,
                notes: form.notes.length > 0 ? form.notes : undefined,
              }),
            })
            if (!res.ok) {
              const j = (await res.json().catch(() => ({}))) as { error?: string }
              throw new Error(j.error ?? `HTTP ${res.status}`)
            }
            refresh()
          }}
        />
      )}

      {editingRow && (
        <FixedCostFormModal
          title="Редактирование расхода"
          initial={rowToForm(editingRow)}
          onCancel={() => setEditingRow(null)}
          onSubmit={async (form) => {
            const res = await fetch(`/api/admin/economy/fixed-costs/${editingRow.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: form.name,
                amountNative: Number(form.amountNative),
                nativeCurrency: form.nativeCurrency,
                period: form.period,
                category: form.category,
                notes: form.notes.length > 0 ? form.notes : null,
              }),
            })
            if (!res.ok) {
              const j = (await res.json().catch(() => ({}))) as { error?: string }
              throw new Error(j.error ?? `HTTP ${res.status}`)
            }
            refresh()
          }}
        />
      )}
    </>
  )
}

function FixedCostFormModal({
  title,
  initial,
  onSubmit,
  onCancel,
}: {
  title: string
  initial: FormState
  onSubmit: (form: FormState) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<FormState>(initial)
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (form.name.trim().length === 0) {
      setLocalError('Название обязательно')
      return
    }
    const amount = Number(form.amountNative)
    if (!Number.isFinite(amount) || amount < 0) {
      setLocalError('Сумма должна быть неотрицательным числом')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(form)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={title} onClose={onCancel}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ModalField label="Название">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-transparent text-ink outline-none"
            required
          />
        </ModalField>

        <div className="grid grid-cols-2 gap-3">
          <ModalField label="Сумма">
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amountNative}
              onChange={(e) => setForm({ ...form, amountNative: e.target.value })}
              className="w-full bg-transparent font-mono tabular-nums text-ink outline-none"
              required
            />
          </ModalField>
          <ModalField label="Валюта">
            <select
              value={form.nativeCurrency}
              onChange={(e) =>
                setForm({ ...form, nativeCurrency: e.target.value as FormState['nativeCurrency'] })
              }
              className="w-full bg-transparent text-ink outline-none"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </ModalField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ModalField label="Период">
            <select
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value as FormState['period'] })}
              className="w-full bg-transparent text-ink outline-none"
            >
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </ModalField>
          <ModalField label="Категория">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as FormState['category'] })}
              className="w-full bg-transparent text-ink outline-none"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </ModalField>
        </div>

        <ModalField label="Активен с">
          <input
            type="date"
            value={form.startedAt}
            onChange={(e) => setForm({ ...form, startedAt: e.target.value })}
            className="w-full bg-transparent text-ink outline-none"
          />
        </ModalField>

        <ModalField label="Заметка (необязательно)">
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full resize-none bg-transparent text-sm text-ink outline-none"
          />
        </ModalField>

        {localError && (
          <p className="font-mono text-[11px] uppercase tracking-wider text-red-600">
            {localError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-rad-sm px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-muted transition-colors hover:text-ink"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-rad-sm bg-ink px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-page disabled:opacity-50"
          >
            {submitting ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
