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

  // Параллельно запускаем все запросы
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

  // Подсчёт уникальных user_id для активных юзеров
  const activeUserIds = new Set(
    (activeUsersResult.data ?? []).map((row) => row.user_id as string)
  )

  // Хелпер для суммирования cost_usd из массива
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
    <div className="bg-white border border-[#E0DDD6] rounded-lg p-6">
      <div className="text-xs uppercase tracking-wide text-[#6B6560] font-medium">
        {label}
      </div>
      <div className="text-3xl font-bold text-[#1A1A1A] mt-2">{value}</div>
      {hint && <div className="text-xs text-[#6B6560] mt-1">{hint}</div>}
    </div>
  )
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`
}

export default async function AdminDashboardPage() {
  const stats = await loadDashboardStats()

  return (
    <div>
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-[#1A1A1A]">Dashboard</h2>
        <p className="text-sm text-[#6B6560] mt-1">
          Сводка по проекту на сегодня
        </p>
      </header>

      <section className="mb-10">
        <h3 className="text-xs uppercase tracking-wide text-[#6B6560] font-medium mb-3">
          Пользователи
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <h3 className="text-xs uppercase tracking-wide text-[#6B6560] font-medium mb-3">
          Расходы на AI
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Сегодня"
            value={formatUsd(stats.costToday)}
            hint="Anthropic + ElevenLabs + OpenAI"
          />
          <StatCard
            label="За 7 дней"
            value={formatUsd(stats.costWeek)}
          />
          <StatCard
            label="За 30 дней"
            value={formatUsd(stats.costMonth)}
          />
        </div>
      </section>
    </div>
  )
}
