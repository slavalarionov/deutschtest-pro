'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SuccessState {
  modulesGranted: number
  newBalance: number
}

export function PromoRedeemForm({ currentBalance }: { currentBalance: number }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<SuccessState | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const normalized = code.trim().toUpperCase()
    if (normalized.length < 3) {
      setError('Введите код.')
      return
    }
    setError(null)
    setSuccess(null)
    setSubmitting(true)
    const res = await fetch('/api/promo/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: normalized }),
    })
    setSubmitting(false)
    const json = (await res.json().catch(() => ({}))) as {
      error?: string
      modules_granted?: number
      new_balance?: number
    }
    if (!res.ok) {
      setError(json.error ?? `HTTP ${res.status}`)
      return
    }
    if (typeof json.modules_granted === 'number' && typeof json.new_balance === 'number') {
      setSuccess({
        modulesGranted: json.modules_granted,
        newBalance: json.new_balance,
      })
      setCode('')
      router.refresh()
    }
  }

  if (success) {
    return (
      <div className="rounded-rad border border-accent/40 bg-accent-soft p-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-accent-ink">
          Успешно
        </div>
        <div className="mt-2 font-display text-3xl tracking-tight text-ink">
          +{success.modulesGranted} модулей зачислено.
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          Новый баланс:{' '}
          <strong className="font-mono tabular-nums text-ink">
            {success.newBalance.toLocaleString('ru-RU')}
          </strong>{' '}
          (было {currentBalance.toLocaleString('ru-RU')}).
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={() => setSuccess(null)}
            className="inline-flex items-center rounded-rad-pill border border-line bg-card px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            Ввести ещё код
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center rounded-rad-pill bg-ink px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-page transition-colors hover:bg-ink/90"
          >
            В личный кабинет
          </a>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block rounded-rad border border-line bg-card px-5 py-4 transition-colors focus-within:border-ink">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Промокод
        </div>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={32}
          placeholder="WELCOME10"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="mt-1 w-full bg-transparent font-mono text-2xl uppercase tracking-wider text-ink placeholder:text-muted focus:outline-none"
        />
      </label>

      {error && <div className="text-sm text-error">{error}</div>}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center rounded-rad-pill bg-ink px-6 py-3 font-mono text-xs uppercase tracking-wider text-page transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Активируем…' : 'Активировать'}
      </button>
    </form>
  )
}
