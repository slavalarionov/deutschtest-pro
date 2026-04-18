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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">{t('title')}</h1>
        <p className="mt-1 text-sm text-brand-muted">{t('subtitle')}</p>
      </div>

      <section className="rounded-2xl bg-brand-white p-6 shadow-soft">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">
          {t('currentBalance')}
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-4xl font-bold text-brand-text">
            {isAdmin ? t('balanceUnlimited') : balance}
          </span>
          {!isAdmin && (
            <span className="text-sm text-brand-muted">
              {t('balanceUnit', { count: balance })}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-brand-muted">
          {isAdmin ? t('adminHint') : t('creditExplanation')}
        </p>
      </section>

      <section className="rounded-2xl bg-brand-white p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-brand-text">
          {t('buyTitle')}
        </h2>
        <p className="mt-1 text-sm text-brand-muted">{t('buyHint')}</p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-gold-dark"
        >
          {t('viewPackages')}
        </Link>
      </section>

      <section className="rounded-2xl bg-brand-white p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-brand-text">
          {t('historyTitle')}
        </h2>
        <div className="mt-4 rounded-xl border border-dashed border-brand-border bg-brand-surface px-6 py-10 text-center">
          <p className="text-sm font-medium text-brand-text">
            {t('historyEmpty')}
          </p>
          <p className="mt-2 text-xs text-brand-muted">{t('historyHint')}</p>
        </div>
      </section>
    </div>
  )
}
