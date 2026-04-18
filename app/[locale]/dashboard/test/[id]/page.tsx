import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import { loadTestDetails } from '@/lib/dashboard/test-details'
import { getModulesBalance } from '@/lib/billing'
import { TestDetailsView } from '@/components/dashboard/TestDetailsView'

export const dynamic = 'force-dynamic'

export default async function TestDetailsPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Layout already redirects if no user; keep TS happy.
  if (!user) return null

  const [result, modulesBalance, t] = await Promise.all([
    loadTestDetails(user.id, params.id),
    getModulesBalance(user.id),
    getTranslations('dashboard.testDetail'),
  ])

  if (!result.ok) {
    const message =
      result.reason === 'forbidden'
        ? t('errors.forbidden')
        : result.reason === 'not_submitted'
          ? t('errors.notSubmitted')
          : t('errors.notFound')

    return (
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard/history"
          className="text-sm text-brand-muted hover:text-brand-text"
        >
          {t('backToHistory')}
        </Link>
        <div className="mt-6 rounded-2xl bg-brand-white p-10 text-center shadow-soft">
          <p className="text-sm font-medium text-brand-text">{message}</p>
          <Link
            href="/dashboard/history"
            className="mt-6 inline-block rounded-lg bg-brand-gold px-5 py-2 text-sm font-semibold text-white hover:bg-brand-gold-dark"
          >
            {t('toHistory')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <TestDetailsView details={result.details} modulesBalance={modulesBalance} />
  )
}
