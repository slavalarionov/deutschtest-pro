import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  attemptsToday: number
  costToday: number
  costWeek: number
  costMonth: number
}

async function loadDashboardStats(): Promise<DashboardStats> {
  const supabase = createAdminClient()

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalUsersResult,
    activeUsersResult,
    attemptsTodayResult,
    costTodayResult,
    costWeekResult,
    costMonthResult,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('user_attempts')
      .select('user_id', { count: 'exact', head: false })
      .not('user_id', 'is', null),
    supabase
      .from('user_attempts')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', startOfToday.toISOString()),
    supabase
      .from('ai_usage_log')
      .select('cost_usd')
      .gte('created_at', startOfToday.toISOString()),
    supabase
      .from('ai_usage_log')
      .select('cost_usd')
      .gte('created_at', sevenDaysAgo.toISOString()),
    supabase
      .from('ai_usage_log')
      .select('cost_usd')
      .gte('created_at', thirtyDaysAgo.toISOString()),
  ])

  const activeUserIds = new Set(
    (activeUsersResult.data ?? []).map((row) => row.user_id as string)
  )

  const sumCost = (rows: { cost_usd: number | string | null }[] | null): number => {
    if (!rows) return 0
    return rows.reduce((acc, row) => acc + Number(row.cost_usd ?? 0), 0)
  }

  return {
    totalUsers: totalUsersResult.count ?? 0,
    activeUsers: activeUserIds.size,
    attemptsToday: attemptsTodayResult.count ?? 0,
    costToday: sumCost(costTodayResult.data),
    costWeek: sumCost(costWeekResult.data),
    costMonth: sumCost(costMonthResult.data),
  }
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-rad border border-line bg-card p-6">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </div>
      <div className="mt-3 font-display text-4xl tracking-tight tabular-nums text-ink">
        {value}
      </div>
      {hint && (
        <div className="mt-2 font-mono text-[11px] uppercase tracking-wider text-muted">
          {hint}
        </div>
      )}
    </div>
  )
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`
}

export default async function AdminDashboardPage() {
  const stats = await loadDashboardStats()

  return (
    <div className="max-w-6xl">
      <header className="mb-10">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Admin dashboard
        </div>
        <h1 className="mt-3 font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
          Сводка.
          <br />
          <span className="text-ink-soft">Текущие цифры.</span>
        </h1>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Пользователи
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            label="Всего зарегистрировано"
            value={stats.totalUsers.toLocaleString('ru-RU')}
          />
          <StatCard
            label="С хотя бы одной попыткой"
            value={stats.activeUsers.toLocaleString('ru-RU')}
            hint={
              stats.totalUsers > 0
                ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% от всех`
                : undefined
            }
          />
          <StatCard
            label="Тестов запущено сегодня"
            value={stats.attemptsToday.toLocaleString('ru-RU')}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Расходы на AI
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            label="Сегодня"
            value={formatUsd(stats.costToday)}
            hint="Anthropic + ElevenLabs + OpenAI"
          />
          <StatCard label="За 7 дней" value={formatUsd(stats.costWeek)} />
          <StatCard label="За 30 дней" value={formatUsd(stats.costMonth)} />
        </div>
      </section>
    </div>
  )
}
