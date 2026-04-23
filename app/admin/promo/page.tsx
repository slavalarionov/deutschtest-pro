import { requireAdminPage } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { PromoManager, type PromoRow } from './promo-manager'

export const dynamic = 'force-dynamic'

interface PromoDbRow {
  id: string
  code: string
  modules_reward: number
  max_redemptions: number | null
  current_redemptions: number | null
  valid_until: string | null
  one_per_user: boolean | null
  is_active: boolean | null
  created_at: string | null
}

async function loadPromoRows(): Promise<PromoRow[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('promo_codes')
    .select(
      'id, code, modules_reward, max_redemptions, current_redemptions, valid_until, one_per_user, is_active, created_at',
    )
    .order('created_at', { ascending: false })

  const now = Date.now()

  return ((data ?? []) as PromoDbRow[]).map((r) => {
    const expired = r.valid_until ? new Date(r.valid_until).getTime() < now : false
    const status: PromoRow['status'] =
      r.is_active === false ? 'inactive' : expired ? 'expired' : 'active'
    return {
      id: r.id,
      code: r.code,
      modulesReward: r.modules_reward,
      maxRedemptions: r.max_redemptions,
      currentRedemptions: r.current_redemptions ?? 0,
      validUntil: r.valid_until,
      onePerUser: r.one_per_user ?? true,
      isActive: r.is_active ?? true,
      createdAt: r.created_at,
      status,
    }
  })
}

export default async function AdminPromoPage() {
  await requireAdminPage('/admin/promo')
  const rows = await loadPromoRows()

  return (
    <div className="max-w-6xl">
      <header className="mb-10">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Admin · promo-codes
        </div>
        <h1 className="mt-3 font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
          Промокоды.
          <br />
          <span className="text-ink-soft tabular-nums">
            {rows.length.toLocaleString('ru-RU')} всего.
          </span>
        </h1>
      </header>

      <PromoManager rows={rows} />
    </div>
  )
}
