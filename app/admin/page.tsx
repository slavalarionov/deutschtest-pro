import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const MODULE_KEYS = ['lesen', 'horen', 'schreiben', 'sprechen'] as const
type ModuleKey = (typeof MODULE_KEYS)[number]
const MODULE_LABELS: Record<ModuleKey, string> = {
  lesen: 'Lesen',
  horen: 'Hören',
  schreiben: 'Schreiben',
  sprechen: 'Sprechen',
}

interface BasicStats {
  totalUsers: number
  activeUsers: number
  attemptsToday: number
  costToday: number
  costWeek: number
  costMonth: number
}

interface ModuleCostRow {
  module: ModuleKey
  avgCostUsd: number
  sessionCount: number
}

interface RetentionRow {
  cohortSize: number
  firstAttemptUsers: number
  returnedUsers: number
  retentionPct: number | null
}

interface FunnelRow {
  registered: number
  tookFirstModule: number
  spentAllFree: number
  purchased: number | null
}

interface FeedbackStats {
  avgRating: number | null
  sampleSize: number
}

interface DashboardData {
  basic: BasicStats
  marginByModule: ModuleCostRow[]
  retention7d: RetentionRow
  retention30d: RetentionRow
  funnel: FunnelRow
  feedback30d: FeedbackStats
}

async function loadBasicStats(): Promise<BasicStats> {
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

/**
 * Cost per module: aggregate ai_usage_log rows by session_id (sum cost_usd
 * per session), then join exam_sessions.mode to group by module, then average.
 * Only single-module sessions are counted — multi-module sessions mix costs
 * across types and can't be cleanly attributed.
 */
async function loadMarginByModule(): Promise<ModuleCostRow[]> {
  const supabase = createAdminClient()

  const [usageRes, sessionsRes] = await Promise.all([
    supabase
      .from('ai_usage_log')
      .select('session_id, cost_usd')
      .not('session_id', 'is', null),
    supabase
      .from('exam_sessions')
      .select('id, mode')
      .in('mode', MODULE_KEYS as unknown as string[]),
  ])

  const costBySession = new Map<string, number>()
  for (const row of usageRes.data ?? []) {
    const id = row.session_id as string | null
    if (!id) continue
    const prev = costBySession.get(id) ?? 0
    costBySession.set(id, prev + Number(row.cost_usd ?? 0))
  }

  const bucket = new Map<ModuleKey, { sum: number; count: number }>()
  for (const session of sessionsRes.data ?? []) {
    const id = session.id as string
    const mode = session.mode as ModuleKey | null
    if (!mode || !MODULE_KEYS.includes(mode)) continue
    const cost = costBySession.get(id)
    if (cost === undefined) continue
    const b = bucket.get(mode) ?? { sum: 0, count: 0 }
    b.sum += cost
    b.count += 1
    bucket.set(mode, b)
  }

  return MODULE_KEYS.map((module) => {
    const b = bucket.get(module)
    return {
      module,
      avgCostUsd: b && b.count > 0 ? b.sum / b.count : 0,
      sessionCount: b?.count ?? 0,
    }
  })
}

/**
 * Cohort retention. Cohort = users registered in [now-cohortUpper, now-cohortLower) days.
 * Denominator = cohort users with at least one attempt.
 * Numerator = cohort users whose 2nd attempt happened within `windowDays` of the 1st.
 * Returns retentionPct = null when cohortSize < 5 (not enough data).
 */
async function loadRetention(
  cohortLower: number,
  cohortUpper: number,
  windowDays: number
): Promise<RetentionRow> {
  const supabase = createAdminClient()
  const now = Date.now()
  const cohortStart = new Date(now - cohortUpper * 24 * 60 * 60 * 1000)
  const cohortEnd = new Date(now - cohortLower * 24 * 60 * 60 * 1000)

  const { data: cohort } = await supabase
    .from('profiles')
    .select('id')
    .gte('created_at', cohortStart.toISOString())
    .lt('created_at', cohortEnd.toISOString())

  const cohortIds = (cohort ?? []).map((row) => row.id as string)
  const cohortSize = cohortIds.length

  if (cohortSize === 0) {
    return { cohortSize: 0, firstAttemptUsers: 0, returnedUsers: 0, retentionPct: null }
  }

  const { data: attempts } = await supabase
    .from('user_attempts')
    .select('user_id, started_at')
    .in('user_id', cohortIds)
    .order('started_at', { ascending: true })

  const byUser = new Map<string, Date[]>()
  for (const row of attempts ?? []) {
    const uid = row.user_id as string | null
    const started = row.started_at as string | null
    if (!uid || !started) continue
    const list = byUser.get(uid) ?? []
    list.push(new Date(started))
    byUser.set(uid, list)
  }

  let firstAttemptUsers = 0
  let returnedUsers = 0
  const windowMs = windowDays * 24 * 60 * 60 * 1000
  for (const dates of byUser.values()) {
    if (dates.length === 0) continue
    firstAttemptUsers += 1
    if (dates.length < 2) continue
    const delta = dates[1].getTime() - dates[0].getTime()
    if (delta > 0 && delta <= windowMs) returnedUsers += 1
  }

  const retentionPct =
    cohortSize >= 5 && firstAttemptUsers > 0
      ? Math.round((returnedUsers / firstAttemptUsers) * 100)
      : null

  return { cohortSize, firstAttemptUsers, returnedUsers, retentionPct }
}

async function loadFunnel(): Promise<FunnelRow> {
  const supabase = createAdminClient()

  const [registeredRes, attemptsRes, zeroBalanceRes] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('user_attempts')
      .select('user_id')
      .not('user_id', 'is', null),
    supabase
      .from('profiles')
      .select('id')
      .eq('modules_balance', 0),
  ])

  const attemptsByUser = new Map<string, number>()
  for (const row of attemptsRes.data ?? []) {
    const uid = row.user_id as string | null
    if (!uid) continue
    attemptsByUser.set(uid, (attemptsByUser.get(uid) ?? 0) + 1)
  }

  const tookFirstModule = attemptsByUser.size

  const zeroBalanceIds = new Set(
    (zeroBalanceRes.data ?? []).map((row) => row.id as string)
  )
  let spentAllFree = 0
  for (const uid of zeroBalanceIds) {
    if ((attemptsByUser.get(uid) ?? 0) >= 3) spentAllFree += 1
  }

  return {
    registered: registeredRes.count ?? 0,
    tookFirstModule,
    spentAllFree,
    purchased: null,
  }
}

async function loadFeedback30d(): Promise<FeedbackStats> {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const { data } = await supabase
    .from('feedback')
    .select('rating')
    .not('rating', 'is', null)
    .gte('created_at', since.toISOString())

  const ratings = ((data ?? []) as { rating: number | null }[])
    .map((r) => r.rating)
    .filter((v): v is number => typeof v === 'number')

  if (ratings.length === 0) {
    return { avgRating: null, sampleSize: 0 }
  }
  const sum = ratings.reduce((a, b) => a + b, 0)
  return { avgRating: sum / ratings.length, sampleSize: ratings.length }
}

async function loadDashboardData(): Promise<DashboardData> {
  const [basic, marginByModule, retention7d, retention30d, funnel, feedback30d] =
    await Promise.all([
      loadBasicStats(),
      loadMarginByModule(),
      loadRetention(8, 14, 7),
      loadRetention(31, 60, 30),
      loadFunnel(),
      loadFeedback30d(),
    ])
  return { basic, marginByModule, retention7d, retention30d, funnel, feedback30d }
}

function StatCard({
  label,
  value,
  caption,
  hint,
  reaction,
}: {
  label: string
  value: string
  caption?: string
  hint?: string
  reaction?: string
}) {
  return (
    <div className="rounded-rad border border-line bg-card p-6">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </div>
      <div className="mt-3 font-display text-4xl tracking-tight tabular-nums text-ink">
        {value}
      </div>
      {caption && (
        <div className="mt-2 font-mono text-[11px] uppercase tracking-wider text-muted">
          {caption}
        </div>
      )}
      {hint && (
        <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted">
          {hint}
        </div>
      )}
      {reaction && (
        <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted">
          {reaction}
        </div>
      )}
    </div>
  )
}

function ModuleMarginCard({
  module,
  avgCostUsd,
  sessionCount,
  barShare,
  allModulesMin,
}: {
  module: ModuleKey
  avgCostUsd: number
  sessionCount: number
  barShare: number
  allModulesMin: number
}) {
  const hasData = sessionCount > 0
  const reaction = hasData ? marginReaction(avgCostUsd, allModulesMin) : ''
  return (
    <div className="rounded-rad border border-line bg-card p-6">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
        {MODULE_LABELS[module]}
      </div>
      <div className={`mt-3 font-display text-4xl tracking-tight tabular-nums ${hasData ? 'text-ink' : 'text-muted'}`}>
        {hasData ? `$${avgCostUsd.toFixed(3)}` : '—'}
      </div>
      <div className="mt-2 font-mono text-[11px] uppercase tracking-wider text-muted tabular-nums">
        {hasData ? `из ${sessionCount} ${sessionPluralizeRu(sessionCount)}` : 'нет данных'}
      </div>
      {reaction && (
        <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted">
          {reaction}
        </div>
      )}
      <div className="mt-4 h-1 w-full bg-surface">
        <div
          className="h-1 bg-ink"
          style={{ width: `${Math.max(0, Math.min(100, barShare * 100)).toFixed(1)}%` }}
        />
      </div>
    </div>
  )
}

function sessionPluralizeRu(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return 'сессий'
  if (mod10 === 1) return 'сессии'
  if (mod10 >= 2 && mod10 <= 4) return 'сессий'
  return 'сессий'
}

function FunnelColumn({
  label,
  count,
  firstStepCount,
  isReference,
  pctOfPrevious,
}: {
  label: string
  count: number | null
  firstStepCount: number
  isReference: boolean
  pctOfPrevious: number | null
}) {
  const isEmpty = count === null
  const barWidthPct = isEmpty
    ? 0
    : firstStepCount > 0
      ? Math.max(Math.round((count! / firstStepCount) * 100), 8)
      : 0
  const barColor = isReference ? 'bg-ink' : 'bg-accent'

  return (
    <div className="flex min-h-[240px] flex-col rounded-rad border border-line bg-card p-6">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </div>
      <div className="mt-4 h-1 w-full bg-surface">
        <div
          className={`h-1 ${barColor}`}
          style={{ width: `${barWidthPct}%` }}
        />
      </div>
      <div
        className={`mt-6 font-display text-4xl tracking-tight tabular-nums ${
          isEmpty ? 'text-muted' : 'text-ink'
        }`}
      >
        {isEmpty ? '—' : count!.toLocaleString('ru-RU')}
      </div>
      <div className="mt-auto space-y-1 pt-6">
        {isReference ? (
          <div className="font-mono text-[11px] uppercase tracking-wider text-muted">
            Базовая когорта
          </div>
        ) : (
          <>
            {pctOfPrevious !== null && !isEmpty && (
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted tabular-nums">
                {pctOfPrevious}% от предыдущего
              </div>
            )}
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted">
              {funnelConversionReaction(isEmpty ? null : pctOfPrevious)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`
}

function activationReaction(percent: number | null, sampleSize: number): string {
  if (sampleSize < 10) return 'Данных мало — ждём рекламу'
  if (percent === null) return 'Нет данных'
  if (percent >= 70) return 'Здоровый онбординг'
  if (percent >= 50) return 'Умеренная активация'
  if (percent >= 1) return 'Онбординг теряет людей'
  return 'Никто не активируется'
}

function retentionReaction(percent: number | null): string {
  if (percent === null) return 'Когорта меньше 5 — ждём'
  if (percent >= 40) return 'Сильная возвращаемость'
  if (percent >= 20) return 'Средняя возвращаемость'
  if (percent >= 1) return 'Слабая возвращаемость'
  return 'Не возвращаются'
}

function funnelConversionReaction(percent: number | null): string {
  if (percent === null) return 'Ждём эквайринг'
  if (percent >= 80) return 'Конверсия высокая'
  if (percent >= 50) return 'Конверсия нормальная'
  if (percent >= 20) return 'Потеря значительная'
  if (percent >= 1) return 'Большая потеря'
  return 'Тупик'
}

function marginReaction(moduleAvg: number | null, allModulesMin: number): string {
  if (moduleAvg === null || allModulesMin === 0) return ''
  const ratio = moduleAvg / allModulesMin
  if (ratio === 1) return 'Дешевле всех'
  if (ratio <= 2) return 'Средний'
  return 'Дороже всех'
}

function feedbackRatingReaction(avg: number | null, sample: number): string {
  if (avg === null || sample < 5) return 'Данных мало — ждём отзывы'
  if (avg >= 4.5) return 'Очень высокая оценка'
  if (avg >= 3.5) return 'Хорошая оценка'
  if (avg >= 2.5) return 'Средняя оценка'
  return 'Низкая оценка — нужно разбираться'
}

function pctOfPrev(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null
  return Math.round((current / previous) * 100)
}

export default async function AdminDashboardPage() {
  const { basic, marginByModule, retention7d, retention30d, funnel, feedback30d } =
    await loadDashboardData()

  const activationPct =
    basic.totalUsers > 0
      ? `${Math.round((basic.activeUsers / basic.totalUsers) * 100)}% от всех`
      : undefined

  const withData = marginByModule.filter((m) => m.sessionCount > 0)
  const maxAvgCost = Math.max(...withData.map((m) => m.avgCostUsd), 0)
  const minAvgCost = withData.length > 0 ? Math.min(...withData.map((m) => m.avgCostUsd)) : 0

  const firstStepCount = funnel.registered
  const funnelSteps: Array<{
    label: string
    count: number | null
    pctOfPrevious: number | null
    isReference: boolean
  }> = [
    {
      label: 'Зарегистрирован',
      count: funnel.registered,
      pctOfPrevious: null,
      isReference: true,
    },
    {
      label: 'Прошёл первый модуль',
      count: funnel.tookFirstModule,
      pctOfPrevious: pctOfPrev(funnel.tookFirstModule, funnel.registered),
      isReference: false,
    },
    {
      label: 'Выжег 3 бесплатных',
      count: funnel.spentAllFree,
      pctOfPrevious: pctOfPrev(funnel.spentAllFree, funnel.tookFirstModule),
      isReference: false,
    },
    {
      label: 'Купил пакет',
      count: funnel.purchased,
      pctOfPrevious: null,
      isReference: false,
    },
  ]

  return (
    <div className="max-w-6xl space-y-14">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Admin dashboard
        </div>
        <h1 className="mt-3 font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
          Сводка.
          <br />
          <span className="text-ink-soft">Текущие цифры.</span>
        </h1>
      </header>

      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Пользователи
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            label="Всего зарегистрировано"
            value={basic.totalUsers.toLocaleString('ru-RU')}
            caption="Всего аккаунтов"
          />
          <StatCard
            label="С хотя бы одной попыткой"
            value={basic.activeUsers.toLocaleString('ru-RU')}
            caption="Из них активировались"
            hint={activationPct}
            reaction={activationReaction(
              basic.totalUsers > 0 ? Math.round((basic.activeUsers / basic.totalUsers) * 100) : null,
              basic.totalUsers,
            )}
          />
          <StatCard
            label="Тестов запущено сегодня"
            value={basic.attemptsToday.toLocaleString('ru-RU')}
            caption="Попытки с 00:00 по серверу"
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
            value={formatUsd(basic.costToday)}
            caption="С начала суток"
            hint="Anthropic + ElevenLabs + OpenAI"
          />
          <StatCard
            label="За 7 дней"
            value={formatUsd(basic.costWeek)}
            caption="Скользящие 7 дней"
          />
          <StatCard
            label="За 30 дней"
            value={formatUsd(basic.costMonth)}
            caption="Скользящие 30 дней"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Себестоимость модулей
        </h2>
        <h3 className="mb-6 font-display text-3xl leading-tight tracking-tight text-ink">
          Сколько стоит один модуль.
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {marginByModule.map((row) => (
            <ModuleMarginCard
              key={row.module}
              module={row.module}
              avgCostUsd={row.avgCostUsd}
              sessionCount={row.sessionCount}
              barShare={maxAvgCost > 0 ? row.avgCostUsd / maxAvgCost : 0}
              allModulesMin={minAvgCost}
            />
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          AI-себестоимость одного прогона. Определит маржу на каждый тип модуля, когда подключится оплата.
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Возвращаемость
        </h2>
        <h3 className="mb-6 font-display text-3xl leading-tight tracking-tight text-ink">
          Возвращаются ли люди.
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <RetentionCard
            label="Retention за 7 дней"
            row={retention7d}
            windowDays={7}
          />
          <RetentionCard
            label="Retention за 30 дней"
            row={retention30d}
            windowDays={30}
          />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Сколько % юзеров вернулись через 7 и 30 дней после первой попытки.
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Feedback
        </h2>
        <h3 className="mb-6 font-display text-3xl leading-tight tracking-tight text-ink">
          Насколько нравится продукт.
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FeedbackRatingCard stats={feedback30d} />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Средний rating пользовательских отзывов за последние 30 дней.
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Воронка активации
        </h2>
        <h3 className="mb-6 font-display text-3xl leading-tight tracking-tight text-ink">
          Путь от регистрации до покупки.
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {funnelSteps.map((step) => (
            <FunnelColumn
              key={step.label}
              label={step.label}
              count={step.count}
              firstStepCount={firstStepCount}
              isReference={step.isReference}
              pctOfPrevious={step.pctOfPrevious}
            />
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Сколько людей доходят от регистрации до оплаты. Шаг «Купил пакет» появится с Robokassa.
        </p>
      </section>
    </div>
  )
}

function RetentionCard({
  label,
  row,
  windowDays,
}: {
  label: string
  row: RetentionRow
  windowDays: number
}) {
  const showValue = row.retentionPct !== null
  const value = showValue ? `${row.retentionPct}%` : '—'
  const hint = showValue
    ? `${row.returnedUsers} из ${row.firstAttemptUsers} — окно ${windowDays} д.`
    : row.cohortSize === 0
      ? 'когорта пустая'
      : `когорта ${row.cohortSize} — недостаточно данных`

  return (
    <div className="rounded-rad border border-line bg-card p-6">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </div>
      <div className={`mt-3 font-display text-4xl tracking-tight tabular-nums ${showValue ? 'text-ink' : 'text-muted'}`}>
        {value}
      </div>
      <div className="mt-2 font-mono text-[11px] uppercase tracking-wider text-muted tabular-nums">
        {hint}
      </div>
      <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted">
        {retentionReaction(row.retentionPct)}
      </div>
    </div>
  )
}

function FeedbackRatingCard({ stats }: { stats: FeedbackStats }) {
  const hasData = stats.avgRating !== null
  const value = hasData ? stats.avgRating!.toFixed(1) : '—'
  const caption = hasData
    ? `из ${stats.sampleSize} ${reviewPluralizeRu(stats.sampleSize)}`
    : 'нет отзывов'

  return (
    <div className="rounded-rad border border-line bg-card p-6">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
        Средний rating (30д)
      </div>
      <div
        className={`mt-3 font-display text-4xl tracking-tight tabular-nums ${
          hasData ? 'text-ink' : 'text-muted'
        }`}
      >
        {value}
        {hasData && <span className="ml-2 text-xl text-ink-soft">/ 5.0</span>}
      </div>
      <div className="mt-2 font-mono text-[11px] uppercase tracking-wider text-muted tabular-nums">
        {caption}
      </div>
      <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted">
        {feedbackRatingReaction(stats.avgRating, stats.sampleSize)}
      </div>
    </div>
  )
}

function reviewPluralizeRu(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return 'отзывов'
  if (mod10 === 1) return 'отзыва'
  if (mod10 >= 2 && mod10 <= 4) return 'отзывов'
  return 'отзывов'
}
