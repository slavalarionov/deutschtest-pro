import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PromoRedeemForm } from './promo-redeem-form'

export const dynamic = 'force-dynamic'

export default async function PromoRedeemPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/promo')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('modules_balance')
    .eq('id', user.id)
    .maybeSingle()

  const currentBalance = profile?.modules_balance ?? 0

  return (
    <main className="min-h-screen bg-page">
      <div className="mx-auto max-w-xl px-6 py-16 sm:py-24">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Promocode
        </div>
        <h1 className="mt-3 font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl">
          Введите промокод.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-ink-soft">
          Если у вас есть промокод, введите его — модули зачислятся на ваш баланс и смогут
          быть потрачены на любой из четырёх модулей экзамена: Lesen, Hören, Schreiben или
          Sprechen.
        </p>

        <div className="mt-8 rounded-rad border border-line bg-card p-6">
          <div className="flex items-baseline justify-between">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Текущий баланс
            </div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted">
              модулей
            </div>
          </div>
          <div className="mt-1 font-display text-4xl tabular-nums text-ink">
            {currentBalance.toLocaleString('ru-RU')}
          </div>
        </div>

        <div className="mt-8">
          <PromoRedeemForm currentBalance={currentBalance} />
        </div>

        <div className="mt-10">
          <Link
            href="/dashboard"
            className="font-mono text-[11px] uppercase tracking-wider text-muted transition-colors hover:text-ink"
          >
            ← В личный кабинет
          </Link>
        </div>
      </div>
    </main>
  )
}
