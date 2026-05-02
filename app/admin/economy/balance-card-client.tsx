'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal, ModalField } from '@/components/admin/Modal'
import { formatUsd, formatEditorialDate } from '@/lib/economy/formatting'

export interface BalanceCardProps {
  provider: 'anthropic' | 'openai' | 'elevenlabs'
  label: string
  manualBalanceUsd: number | null
  manualUpdatedAt: string | null
  manualUpdatedBy: string | null
  spent30dUsd: number
  spentLast24hUsd: number
}

interface HistoryEntry {
  balanceUsd: number
  recordedAt: string
  notes: string | null
  recordedBy: string | null
}

export function BalanceCardClient(props: BalanceCardProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submitBalance(formData: FormData) {
    setError(null)
    setSubmitting(true)
    const balanceUsd = Number(formData.get('balanceUsd'))
    const notes = String(formData.get('notes') ?? '').trim()

    if (!Number.isFinite(balanceUsd) || balanceUsd < 0) {
      setError('Введите неотрицательное число')
      setSubmitting(false)
      return
    }

    const res = await fetch('/api/admin/economy/balances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: props.provider,
        balanceUsd,
        notes: notes.length > 0 ? notes : undefined,
      }),
    })

    setSubmitting(false)

    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      setError(j.error ?? `HTTP ${res.status}`)
      return
    }

    setEditOpen(false)
    setHistory(null)
    startTransition(() => router.refresh())
  }

  async function openHistory() {
    setHistoryOpen(true)
    if (history) return
    setHistoryLoading(true)
    const res = await fetch(`/api/admin/economy/balances?provider=${props.provider}`)
    setHistoryLoading(false)
    if (!res.ok) {
      setError(`Не удалось загрузить историю (HTTP ${res.status})`)
      return
    }
    const j = (await res.json()) as { history: HistoryEntry[] }
    setHistory(j.history)
  }

  return (
    <>
      <article className="flex flex-col gap-4 rounded-rad border border-line bg-card p-6">
        <header>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {props.label}
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="font-display text-4xl tabular-nums tracking-tight text-ink">
              {props.manualBalanceUsd != null ? formatUsd(props.manualBalanceUsd) : '—'}
            </span>
          </div>
          <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted">
            {props.manualUpdatedAt
              ? `обновлено ${formatEditorialDate(props.manualUpdatedAt)}${props.manualUpdatedBy ? ` · ${props.manualUpdatedBy}` : ''}`
              : 'ещё не вводился'}
          </div>
        </header>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-rad-sm border border-line-soft bg-page px-3 py-2">
            <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Расход 30д
            </dt>
            <dd className="mt-1 font-mono tabular-nums text-ink">
              {formatUsd(props.spent30dUsd)}
            </dd>
          </div>
          <div className="rounded-rad-sm border border-line-soft bg-page px-3 py-2">
            <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Расход 24ч
            </dt>
            <dd className="mt-1 font-mono tabular-nums text-ink">
              {formatUsd(props.spentLast24hUsd)}
            </dd>
          </div>
        </dl>

        <div className="mt-auto flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            disabled={pending}
            className="rounded-rad-sm border border-line px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-page disabled:opacity-50"
          >
            Обновить баланс
          </button>
          <button
            type="button"
            onClick={openHistory}
            className="font-mono text-[11px] uppercase tracking-wider text-muted underline-offset-2 transition-colors hover:text-ink hover:underline"
          >
            История →
          </button>
        </div>
      </article>

      {editOpen && (
        <Modal title={`Баланс ${props.label}`} onClose={() => setEditOpen(false)}>
          <form
            action={submitBalance}
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              submitBalance(new FormData(e.currentTarget))
            }}
          >
            <ModalField label="Текущий баланс, $">
              <input
                type="number"
                name="balanceUsd"
                step="0.01"
                min="0"
                required
                defaultValue={props.manualBalanceUsd ?? ''}
                className="w-full bg-transparent font-mono tabular-nums text-ink outline-none"
              />
            </ModalField>
            <ModalField label="Заметка (необязательно)">
              <textarea
                name="notes"
                rows={2}
                placeholder="Например: Пополнил $50 через Wise"
                className="w-full resize-none bg-transparent text-sm text-ink outline-none"
              />
            </ModalField>
            {error && (
              <p className="font-mono text-[11px] uppercase tracking-wider text-red-600">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
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
      )}

      {historyOpen && (
        <Modal title={`История · ${props.label}`} onClose={() => setHistoryOpen(false)}>
          {historyLoading && (
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
              Загрузка…
            </p>
          )}
          {!historyLoading && history && history.length === 0 && (
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
              Записей ещё нет.
            </p>
          )}
          {!historyLoading && history && history.length > 0 && (
            <ul className="divide-y divide-line">
              {history.map((row, i) => (
                <li key={i} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-2xl tabular-nums text-ink">
                      {formatUsd(row.balanceUsd)}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
                      {formatEditorialDate(row.recordedAt)}
                    </span>
                  </div>
                  {row.notes && (
                    <p className="mt-1 text-sm text-ink-soft">{row.notes}</p>
                  )}
                  {row.recordedBy && (
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted">
                      {row.recordedBy}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </>
  )
}
