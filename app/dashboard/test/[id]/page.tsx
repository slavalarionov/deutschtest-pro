import Link from 'next/link'
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

  const [result, modulesBalance] = await Promise.all([
    loadTestDetails(user.id, params.id),
    getModulesBalance(user.id),
  ])

  if (!result.ok) {
    const message =
      result.reason === 'forbidden'
        ? 'Sie haben keinen Zugriff auf dieses Modul.'
        : result.reason === 'not_submitted'
          ? 'Dieses Modul wurde noch nicht abgeschlossen.'
          : 'Modul nicht gefunden.'

    return (
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard/history"
          className="text-sm text-brand-muted hover:text-brand-text"
        >
          ← Zurück zum Verlauf
        </Link>
        <div className="mt-6 rounded-2xl bg-brand-white p-10 text-center shadow-soft">
          <p className="text-sm font-medium text-brand-text">{message}</p>
          <Link
            href="/dashboard/history"
            className="mt-6 inline-block rounded-lg bg-brand-gold px-5 py-2 text-sm font-semibold text-white hover:bg-brand-gold-dark"
          >
            Zur Verlaufsübersicht
          </Link>
        </div>
      </div>
    )
  }

  return (
    <TestDetailsView details={result.details} modulesBalance={modulesBalance} />
  )
}
