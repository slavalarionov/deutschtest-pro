import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase-server'
import { loadDashboardStats, type DashboardModule } from '@/lib/dashboard/stats'
import { ModuleLauncher } from '@/components/exam/ModuleLauncher'

export const dynamic = 'force-dynamic'

const MODULE_LABELS: Record<DashboardModule, string> = {
  lesen: 'Lesen',
  horen: 'Hören',
  schreiben: 'Schreiben',
  sprechen: 'Sprechen',
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function MetricCard({
  label,
  value,
  sublabel,
}: {
  label: string
  value: string
  sublabel?: string
}) {
  return (
    <div className="rounded-2xl bg-brand-white p-5 shadow-soft">
      <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-brand-text">{value}</p>
      {sublabel && (
        <p className="mt-1 text-xs text-brand-muted">{sublabel}</p>
      )}
    </div>
  )
}

export default async function DashboardHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Layout guarantees `user` exists, but TS doesn't know that.
  if (!user) return null

  const [stats, profileRes] = await Promise.all([
    loadDashboardStats(user.id),
    createServerClient()
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  const isAdmin = profileRes.data?.is_admin === true

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">
          Willkommen zurück
        </h1>
        <p className="mt-1 text-sm text-brand-muted">
          Ihr persönlicher Lernbereich — Statistik und neue Prüfungen.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard
          label="Module absolviert"
          value={String(stats.totalModules)}
        />
        <MetricCard
          label="Durchschnittliche Punktzahl"
          value={stats.averageScore !== null ? String(stats.averageScore) : '—'}
          sublabel={stats.averageScore !== null ? 'von 100' : undefined}
        />
        <MetricCard
          label="Bestes Ergebnis"
          value={stats.bestScore !== null ? String(stats.bestScore) : '—'}
          sublabel={stats.bestScore !== null ? 'von 100' : undefined}
        />
        <MetricCard
          label="Letztes Modul"
          value={
            stats.lastModule
              ? `${MODULE_LABELS[stats.lastModule.moduleId]} · ${stats.lastModule.score}`
              : '—'
          }
          sublabel={
            stats.lastModule
              ? `${stats.lastModule.level} · ${formatDate(stats.lastModule.submittedAt)}`
              : 'Noch keine Versuche'
          }
        />
        <MetricCard
          label="Verfügbare Credits"
          value={isAdmin ? '∞' : String(stats.modulesBalance)}
          sublabel={isAdmin ? 'Admin-Modus' : '1 Credit = 1 Modul'}
        />
      </div>

      <ModuleLauncher modulesBalance={stats.modulesBalance} isAdmin={isAdmin} />
    </div>
  )
}
