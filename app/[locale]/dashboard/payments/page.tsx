import { getFormatter, getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase-server'
import type { Locale } from '@/i18n/request'

export const dynamic = 'force-dynamic'

interface PaymentRow {
  id: string
  package_id: string
  package_size: number
  amount_minor: number
  amount_currency: 'RUB' | 'EUR'
  status: 'pending' | 'approved' | 'failed' | 'refunded' | 'expired'
  payment_method: string | null
  created_at: string
}

export default async function DashboardPaymentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const locale = (await getLocale()) as Locale

  const [{ data: profile }, { data: paymentRows }, t, tHistory] = await Promise.all([
    createServerClient()
      .from('profiles')
      .select('modules_balance, is_admin')
      .eq('id', user.id)
      .maybeSingle(),
    createServerClient()
      .from('payments')
      .select(
        'id, package_id, package_size, amount_minor, amount_currency, status, payment_method, created_at',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    getTranslations('dashboard.payments'),
    getTranslations('payment.history'),
  ])

  const isAdmin = profile?.is_admin === true
  const balance =
    typeof profile?.modules_balance === 'number' ? profile.modules_balance : 0

  const payments = (paymentRows ?? []) as PaymentRow[]
  const format = await getFormatter()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="mt-3 font-display text-6xl leading-[1] tracking-[-0.035em] md:text-7xl">
          <span className="block text-ink">{t('headline.strong')}</span>
          <span className="block text-ink-soft">{t('headline.muted')}</span>
        </h1>
      </header>

      <section className="rounded-rad border border-line bg-card p-14 text-center">
        <p className="eyebrow">{t('balanceEyebrow')}</p>

        {isAdmin ? (
          <>
            <div className="mt-4 font-display text-6xl tracking-[-0.03em] text-ink md:text-7xl">
              ∞
            </div>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-muted">
              {t('balanceUnlimitedMono')}
            </p>
          </>
        ) : (
          <>
            <div className="mt-4 font-display text-7xl tracking-[-0.03em] text-ink md:text-8xl">
              {balance}
            </div>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-muted">
              {t('balanceUnitMono', { count: balance })}
            </p>
          </>
        )}

        <div className="mt-10 border-t border-line pt-8">
          <p className="eyebrow">{t('hintEyebrow')}</p>
          <p className="mt-3 text-ink-soft">
            {isAdmin ? t('adminHint') : t('balanceExplanation')}
          </p>
        </div>
      </section>

      <section className="rounded-rad border border-line bg-surface p-8">
        <p className="eyebrow">{t('buyEyebrow')}</p>
        <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <h2 className="font-display text-2xl tracking-[-0.02em] text-ink">
              {t('buyHeadline')}
            </h2>
            <p className="mt-2 text-ink-soft">{t('buyHint')}</p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex flex-shrink-0 items-center justify-center rounded-rad-pill bg-ink px-8 py-3 text-sm font-medium text-page transition-colors hover:bg-ink-soft"
          >
            {t('viewPackages')}
          </Link>
        </div>
      </section>

      <section className="rounded-rad border border-line bg-card p-8">
        <p className="eyebrow">{tHistory('eyebrow')}</p>
        <h2 className="mt-3 font-display text-3xl tracking-[-0.02em] text-ink">
          {tHistory('title')}
        </h2>

        {payments.length === 0 ? (
          <p className="mt-8 text-center text-muted">{tHistory('empty')}</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-wider text-muted">
                  <th className="pb-3 pr-4">{tHistory('cols.date')}</th>
                  <th className="pb-3 pr-4">{tHistory('cols.package')}</th>
                  <th className="pb-3 pr-4">{tHistory('cols.amount')}</th>
                  <th className="pb-3 pr-4">{tHistory('cols.status')}</th>
                  <th className="pb-3">{tHistory('cols.method')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {payments.map((p) => {
                  const major = p.amount_minor / 100
                  const amount = format.number(major, {
                    style: 'currency',
                    currency: p.amount_currency,
                    minimumFractionDigits: p.amount_currency === 'RUB' ? 0 : 2,
                    maximumFractionDigits: p.amount_currency === 'RUB' ? 0 : 2,
                  })
                  const date = format.dateTime(new Date(p.created_at), {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                  const statusKey =
                    `status.${p.status}` as `status.${PaymentRow['status']}`
                  const methodKey = p.payment_method
                    ? (`method.${p.payment_method}` as `method.${string}`)
                    : null
                  const tier = p.package_id.split('-')[1] ?? p.package_id
                  const tierLabel =
                    tier.charAt(0).toUpperCase() + tier.slice(1)
                  return (
                    <tr key={p.id} className="text-ink-soft">
                      <td className="py-3 pr-4 font-mono text-[12px] text-ink">
                        {date}
                      </td>
                      <td className="py-3 pr-4 text-ink">
                        {tierLabel} · {p.package_size}{' '}
                        {locale === 'ru' ? 'мод.' : 'mod.'}
                      </td>
                      <td className="py-3 pr-4 tabular-nums">{amount}</td>
                      <td className="py-3 pr-4">
                        <StatusPill status={p.status} label={tHistory(statusKey)} />
                      </td>
                      <td className="py-3 font-mono text-[11px] uppercase tracking-wider">
                        {methodKey ? tHistory(methodKey) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function StatusPill({
  status,
  label,
}: {
  status: PaymentRow['status']
  label: string
}) {
  const cls =
    status === 'approved'
      ? 'bg-accent-soft text-accent-ink'
      : status === 'failed' || status === 'expired'
        ? 'bg-error/10 text-error'
        : status === 'refunded'
          ? 'border border-line bg-surface text-ink-soft'
          : 'border border-line-soft bg-surface text-ink-soft'
  return (
    <span
      className={`inline-flex items-center rounded-rad-pill px-3 py-1 font-mono text-[11px] uppercase tracking-wider ${cls}`}
    >
      {label}
    </span>
  )
}
