'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { PERIOD_OPTIONS, type EconomyPeriod } from '@/lib/economy/period'

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
      {PERIOD_OPTIONS.map((opt) => {
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
