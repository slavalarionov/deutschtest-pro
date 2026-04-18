import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function DashboardPaymentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await createServerClient()
    .from('profiles')
    .select('modules_balance, is_admin')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = profile?.is_admin === true
  const balance =
    typeof profile?.modules_balance === 'number' ? profile.modules_balance : 0

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Zahlungen</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Ihr Guthaben, Kaufoptionen und Zahlungshistorie.
        </p>
      </div>

      <section className="rounded-2xl bg-brand-white p-6 shadow-soft">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">
          Aktuelles Guthaben
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-4xl font-bold text-brand-text">
            {isAdmin ? 'Unbegrenzt' : balance}
          </span>
          {!isAdmin && (
            <span className="text-sm text-brand-muted">
              {balance === 1 ? 'Modul' : 'Module'}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-brand-muted">
          {isAdmin
            ? 'Admin-Modus — keine Limits.'
            : '1 Credit entspricht einem Prüfungsmodul (Lesen, Hören, Schreiben oder Sprechen).'}
        </p>
      </section>

      <section className="rounded-2xl bg-brand-white p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-brand-text">Module kaufen</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Wählen Sie ein Paket — gekaufte Module sind frei kombinierbar
          zwischen Lesen, Hören, Schreiben und Sprechen.
        </p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-gold-dark"
        >
          Pakete ansehen
        </Link>
      </section>

      <section className="rounded-2xl bg-brand-white p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-brand-text">Zahlungshistorie</h2>
        <div className="mt-4 rounded-xl border border-dashed border-brand-border bg-brand-surface px-6 py-10 text-center">
          <p className="text-sm font-medium text-brand-text">
            Noch keine Zahlungen
          </p>
          <p className="mt-2 text-xs text-brand-muted">
            Die Zahlungshistorie wird verfügbar, sobald das Zahlungssystem
            aktiviert ist.
          </p>
        </div>
      </section>
    </div>
  )
}
