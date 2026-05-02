'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'

export type EconomyPeriod = '7d' | '30d' | '90d' | 'all'

const OPTIONS: ReadonlyArray<{ id: EconomyPeriod; label: string }> = [
  { id: '7d', label: '7 дней' },
  { id: '30d', label: '30 дней' },
  { id: '90d', label: '90 дней' },
  { id: 'all', label: 'Всё время' },
]

export const ALL_PERIOD_DAYS = 365

export function periodToDays(period: EconomyPeriod): number {
  switch (period) {
    case '7d':
      return 7
    case '30d':
      return 30
    case '90d':
      return 90
    case 'all':
      return ALL_PERIOD_DAYS
  }
}

export function parsePeriod(raw: string | string[] | undefined): EconomyPeriod {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value === '7d' || value === '30d' || value === '90d' || value === 'all') {
    return value
  }
  return '30d'
}

export function periodLabel(period: EconomyPeriod): string {
  return OPTIONS.find((o) => o.id === period)?.label ?? '30 дней'
}

export function PeriodSelector({ current }: { current: EconomyPeriod }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  function selectPeriod(period: EconomyPeriod) {
    if (period === current) return
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('period', period)
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-rad border border-line bg-card p-1 ${pending ? 'opacity-70' : ''}`}
      role="tablist"
      aria-label="Период"
    >
      {OPTIONS.map((opt) => {
        const active = opt.id === current
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => selectPeriod(opt.id)}
            className={
              active
                ? 'rounded-rad-sm bg-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-page'
                : 'rounded-rad-sm px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-muted transition-colors hover:text-ink'
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
