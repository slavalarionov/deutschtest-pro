'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { StatusChip } from '@/components/admin/StatusChip'
import { Modal, ModalField } from '@/components/admin/Modal'

export interface PromoRow {
  id: string
  code: string
  modulesReward: number
  maxRedemptions: number | null
  currentRedemptions: number
  validUntil: string | null
  onePerUser: boolean
  isActive: boolean
  createdAt: string | null
  status: 'active' | 'inactive' | 'expired'
}

interface RedemptionRow {
  redeemedAt: string | null
  modulesGranted: number
  userEmail: string | null
}

const MONTHS_RU = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК']

function formatEditorialDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getUTCDate()} ${MONTHS_RU[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function formatRedemptionsLimit(current: number, max: number | null): string {
  return `${current} / ${max ?? '∞'}`
}

function statusLabel(status: PromoRow['status']): string {
  if (status === 'active') return 'active'
  if (status === 'inactive') return 'inactive'
  return 'expired'
}

function statusVariant(status: PromoRow['status']): 'active' | 'blocked' | 'regular' {
  if (status === 'active') return 'active'
  if (status === 'expired') return 'blocked'
  return 'regular'
}

export function PromoManager({ rows }: { rows: PromoRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [createOpen, setCreateOpen] = useState(false)
  const [historyOpenFor, setHistoryOpenFor] = useState<PromoRow | null>(null)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function refresh() {
    setCreateOpen(false)
    startTransition(() => router.refresh())
  }

  async function deactivate(id: string) {
    if (!confirm('Отключить промокод? Отмена активации потом невозможна.')) return
    setDeactivatingId(id)
    setError(null)
    const res = await fetch('/api/admin/promo/deactivate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setDeactivatingId(null)
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      setError(j.error ?? `HTTP ${res.status}`)
      return
    }
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[11px] uppercase tracking-wider text-muted">
          Список кодов
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center rounded-rad-pill bg-ink px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-page transition-colors hover:bg-ink/90"
        >
          + Создать промокод
        </button>
      </div>

      {error && (
        <div className="rounded-rad-sm border border-error bg-error-soft px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-rad border border-line bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="border-b border-line bg-surface">
              <tr className="font-mono text-[10px] uppercase tracking-widest text-muted">
                <th className="px-4 py-3 text-left font-normal">Код</th>
                <th className="px-4 py-3 text-right font-normal">Награда</th>
                <th className="px-4 py-3 text-right font-normal">Активаций / лимит</th>
                <th className="px-4 py-3 text-left font-normal">Действителен до</th>
                <th className="px-4 py-3 text-left font-normal">Статус</th>
                <th className="px-4 py-3 font-normal" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center font-mono text-xs text-muted"
                  >
                    Промокодов нет. Создайте первый, чтобы начать выдавать бонусные модули.
                  </td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-line-soft transition-colors last:border-0 hover:bg-surface/50"
                  >
                    <td className="px-4 py-3 font-mono text-sm uppercase text-ink">{p.code}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-accent-ink">
                      +{p.modulesReward}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-ink">
                      {formatRedemptionsLimit(p.currentRedemptions, p.maxRedemptions)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-muted">
                      {p.validUntil ? formatEditorialDate(p.validUntil) : 'бессрочно'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip variant={statusVariant(p.status)}>
                        {statusLabel(p.status)}
                      </StatusChip>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setHistoryOpenFor(p)}
                          className="inline-flex items-center rounded-rad-pill border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-soft transition-colors hover:border-ink hover:text-ink"
                        >
                          История
                        </button>
                        <button
                          onClick={() => deactivate(p.id)}
                          disabled={!p.isActive || deactivatingId === p.id || pending}
                          className="inline-flex items-center rounded-rad-pill border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {deactivatingId === p.id ? 'Отключаем…' : 'Деактивировать'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {createOpen && <CreatePromoModal onClose={() => setCreateOpen(false)} onDone={refresh} />}
      {historyOpenFor && (
        <HistoryModal
          promo={historyOpenFor}
          onClose={() => setHistoryOpenFor(null)}
        />
      )}
    </div>
  )
}

function CreatePromoModal({
  onClose,
  onDone,
}: {
  onClose: () => void
  onDone: () => void
}) {
  const [code, setCode] = useState('')
  const [reward, setReward] = useState('10')
  const [maxRedemptions, setMaxRedemptions] = useState('100')
  const [unlimitedRedemptions, setUnlimitedRedemptions] = useState(false)
  const [validUntil, setValidUntil] = useState('')
  const [noExpiry, setNoExpiry] = useState(true)
  const [onePerUser, setOnePerUser] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    const normalizedCode = code.trim().toUpperCase()
    if (!/^[A-Z0-9_-]{3,32}$/.test(normalizedCode)) {
      setError('Код должен быть 3–32 символа: A-Z, 0-9, _ или -.')
      return
    }
    const rewardN = Number(reward)
    if (!Number.isInteger(rewardN) || rewardN <= 0) {
      setError('Награда — положительное целое число.')
      return
    }
    let maxRedN: number | null = null
    if (!unlimitedRedemptions) {
      maxRedN = Number(maxRedemptions)
      if (!Number.isInteger(maxRedN) || maxRedN <= 0) {
        setError('Лимит активаций — положительное целое число.')
        return
      }
    }
    let validUntilIso: string | null = null
    if (!noExpiry) {
      if (!validUntil) {
        setError('Укажите дату окончания или отметьте «бессрочно».')
        return
      }
      const d = new Date(`${validUntil}T23:59:59Z`)
      if (Number.isNaN(d.getTime())) {
        setError('Дата окончания невалидная.')
        return
      }
      validUntilIso = d.toISOString()
    }

    setSaving(true)
    const res = await fetch('/api/admin/promo/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: normalizedCode,
        modules_reward: rewardN,
        max_redemptions: maxRedN,
        valid_until: validUntilIso,
        one_per_user: onePerUser,
      }),
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
    <Modal onClose={onClose} title="Новый промокод">
      <ModalField label="Код (A-Z, 0-9, _, -; 3–32 символа)">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="WELCOME10"
          className="w-full bg-transparent font-mono text-sm uppercase text-ink focus:outline-none"
        />
      </ModalField>
      <ModalField label="Сколько модулей начислить (>0)">
        <input
          type="number"
          min={1}
          value={reward}
          onChange={(e) => setReward(e.target.value)}
          className="w-full bg-transparent text-sm text-ink focus:outline-none"
        />
      </ModalField>

      <div className="space-y-2">
        <ModalField label="Лимит активаций (>0)">
          <input
            type="number"
            min={1}
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(e.target.value)}
            disabled={unlimitedRedemptions}
            className="w-full bg-transparent text-sm text-ink focus:outline-none disabled:opacity-40"
          />
        </ModalField>
        <ToggleRow
          label="Без лимита активаций"
          checked={unlimitedRedemptions}
          onChange={setUnlimitedRedemptions}
        />
      </div>

      <div className="space-y-2">
        <ModalField label="Действителен до (включительно)">
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            disabled={noExpiry}
            className="w-full bg-transparent text-sm text-ink focus:outline-none disabled:opacity-40"
          />
        </ModalField>
        <ToggleRow
          label="Бессрочный"
          checked={noExpiry}
          onChange={setNoExpiry}
        />
      </div>

      <ToggleRow
        label="Один раз на пользователя"
        checked={onePerUser}
        onChange={setOnePerUser}
      />

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
          {saving ? 'Создаём…' : 'Создать'}
        </button>
      </div>
    </Modal>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 px-1 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-ink"
      />
      {label}
    </label>
  )
}

function HistoryModal({
  promo,
  onClose,
}: {
  promo: PromoRow
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<RedemptionRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/promo/history?id=${promo.id}`, { method: 'GET' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const j = (await res.json()) as { redemptions: RedemptionRow[] }
        if (!cancelled) setRows(j.redemptions ?? [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Не удалось загрузить историю.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [promo.id])

  return (
    <Modal onClose={onClose} title={`История активаций · ${promo.code}`}>
      <p className="text-sm text-ink-soft">
        Активировано <strong className="text-ink">{promo.currentRedemptions}</strong>{' '}
        {promo.maxRedemptions === null ? 'раз (без лимита)' : `из ${promo.maxRedemptions}`}.
      </p>

      {loading && (
        <div className="font-mono text-[11px] uppercase tracking-wider text-muted">
          Загружаем…
        </div>
      )}

      {error && <div className="text-sm text-error">{error}</div>}

      {!loading && !error && rows && rows.length === 0 && (
        <div className="font-mono text-[11px] uppercase tracking-wider text-muted">
          Пока никто не активировал.
        </div>
      )}

      {!loading && !error && rows && rows.length > 0 && (
        <div className="max-h-80 overflow-auto rounded-rad-sm border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-card">
              <tr className="font-mono text-[10px] uppercase tracking-widest text-muted">
                <th className="px-3 py-2 text-left font-normal">Email</th>
                <th className="px-3 py-2 text-left font-normal">Дата</th>
                <th className="px-3 py-2 text-right font-normal">Модулей</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-line-soft last:border-0">
                  <td className="px-3 py-2 font-mono text-xs text-ink">{r.userEmail ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs tabular-nums text-muted">
                    {formatEditorialDate(r.redeemedAt)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-sm tabular-nums text-accent-ink">
                    +{r.modulesGranted}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={onClose}
          className="inline-flex items-center rounded-rad-pill border border-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Закрыть
        </button>
      </div>
    </Modal>
  )
}
