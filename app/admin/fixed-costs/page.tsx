import { requireAdminPage } from '@/lib/admin/require-admin'
import { listAllFixedCosts } from '@/lib/economy/manual-entries'
import { getMonthlyFixedCostsUsd } from '@/lib/economy/fixed-costs'
import { FixedCostsManager, type FixedCostRowDto } from './fixed-costs-manager'

export const dynamic = 'force-dynamic'

export default async function AdminFixedCostsPage() {
  await requireAdminPage('/admin/fixed-costs')

  const [rows, monthlyUsd] = await Promise.all([
    listAllFixedCosts(true),
    getMonthlyFixedCostsUsd(),
  ])

  const rowsDto: FixedCostRowDto[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    amountNative: r.amountNative,
    nativeCurrency: r.nativeCurrency,
    period: r.period,
    category: r.category,
    startedAt: r.startedAt,
    endedAt: r.endedAt,
    notes: r.notes,
  }))

  return (
    <div className="max-w-6xl">
      <header className="mb-10">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Admin · fixed costs
        </div>
        <h1 className="mt-3 font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
          Постоянные расходы.
          <br />
          <span className="text-ink-soft tabular-nums">
            $
            {monthlyUsd.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            /мес.
          </span>
        </h1>
      </header>

      <FixedCostsManager rows={rowsDto} />
    </div>
  )
}
