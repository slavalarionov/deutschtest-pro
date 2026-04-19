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

    const eyebrow =
      result.reason === 'forbidden'
        ? t('errors.forbiddenEyebrow')
        : result.reason === 'not_submitted'
          ? t('errors.notSubmittedEyebrow')
          : t('errors.notFoundEyebrow')

    return (
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard/history"
          className="text-sm text-ink-soft transition-colors hover:text-ink"
        >
          {t('backToHistory')}
        </Link>
        <div className="mt-10 rounded-rad border border-line bg-card p-14 text-center">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {eyebrow}
          </div>
          <h1 className="mt-3 font-display text-4xl text-ink">{message}</h1>
          <Link
            href="/dashboard/history"
            className="mt-6 inline-flex items-center gap-2 rounded-rad-pill bg-ink px-6 py-3 text-sm font-medium text-page transition-colors hover:bg-ink/90"
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
