import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase-server'
import { loadDashboardStats, type DashboardModule } from '@/lib/dashboard/stats'
import { ModuleLauncher } from '@/components/dashboard/ModuleLauncher'

export const dynamic = 'force-dynamic'

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

  const [stats, profileRes, t, tModules] = await Promise.all([
    loadDashboardStats(user.id),
    createServerClient()
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle(),
    getTranslations('dashboard.overview'),
    getTranslations('modules'),
  ])

  const isAdmin = profileRes.data?.is_admin === true

  const moduleLabels: Record<DashboardModule, string> = {
    lesen: tModules('lesen'),
    horen: tModules('horen'),
    schreiben: tModules('schreiben'),
    sprechen: tModules('sprechen'),
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">{t('title')}</h1>
        <p className="mt-1 text-sm text-brand-muted">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard
          label={t('metrics.modulesTaken')}
          value={String(stats.totalModules)}
        />
        <MetricCard
          label={t('metrics.averageScore')}
          value={stats.averageScore !== null ? String(stats.averageScore) : '—'}
          sublabel={stats.averageScore !== null ? t('outOf100') : undefined}
        />
        <MetricCard
          label={t('metrics.bestScore')}
          value={stats.bestScore !== null ? String(stats.bestScore) : '—'}
          sublabel={stats.bestScore !== null ? t('outOf100') : undefined}
        />
        <MetricCard
          label={t('metrics.lastModule')}
          value={
            stats.lastModule
              ? `${moduleLabels[stats.lastModule.moduleId]} · ${stats.lastModule.score}`
              : '—'
          }
          sublabel={
            stats.lastModule
              ? `${stats.lastModule.level} · ${formatDate(stats.lastModule.submittedAt)}`
              : t('noAttempts')
          }
        />
        <MetricCard
          label={t('metrics.credits')}
          value={isAdmin ? '∞' : String(stats.modulesBalance)}
          sublabel={isAdmin ? t('adminMode') : t('creditHint')}
        />
      </div>

      <ModuleLauncher modulesBalance={stats.modulesBalance} isAdmin={isAdmin} />
    </div>
  )
}
