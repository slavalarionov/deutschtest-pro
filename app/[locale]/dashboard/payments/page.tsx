import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function DashboardPaymentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, t] = await Promise.all([
    createServerClient()
      .from('profiles')
      .select('modules_balance, is_admin')
      .eq('id', user.id)
      .maybeSingle(),
    getTranslations('dashboard.payments'),
  ])

  const isAdmin = profile?.is_admin === true
  const balance =
    typeof profile?.modules_balance === 'number' ? profile.modules_balance : 0

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <header>
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="mt-3 font-display text-6xl leading-[1] tracking-[-0.035em] md:text-7xl">
          <span className="block text-ink">{t('headline.strong')}</span>
          <span className="block text-ink-soft">{t('headline.muted')}</span>
        </h1>
      </header>

      {/* Balance card */}
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
            {isAdmin ? t('adminHint') : t('creditExplanation')}
          </p>
        </div>
      </section>

      {/* Buy card */}
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

      {/* History placeholder */}
      <section className="rounded-rad border border-dashed border-line bg-card p-14 text-center">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
          {t('historyEmptyEyebrow')}
        </p>
        <p className="mt-3 text-muted">{t('historyEmptyLead')}</p>
      </section>
    </div>
  )
}
