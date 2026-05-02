import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProviderCostChart, type ProviderDaily, type ProviderSummary } from './cost-chart'
import { RevenueChart } from './revenue-chart'
import { BalanceCardClient } from './balance-card-client'
import { PeriodSelector } from '@/components/admin/PeriodSelector'
import {
  parsePeriod,
  periodToDays,
  periodLabel,
  type EconomyPeriod,
} from '@/lib/economy/period'
import { getRevenue } from '@/lib/economy/revenue'
import { getProfit } from '@/lib/economy/profit'
import { getAllProviderBalances } from '@/lib/economy/providers'
import { getMonthlyFixedCostsUsd, listFixedCosts } from '@/lib/economy/fixed-costs'
import {
  formatUsd,
  formatRub,
  formatEur,
  formatNative,
  formatPercent,
  formatInteger,
  formatEditorialDate,
} from '@/lib/economy/formatting'

export const dynamic = 'force-dynamic'

const PROVIDERS = ['anthropic', 'elevenlabs', 'openai'] as const
type Provider = (typeof PROVIDERS)[number]
const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: 'Anthropic',
  elevenlabs: 'ElevenLabs',
  openai: 'OpenAI',
}

const LEVELS = ['A1', 'A2', 'B1'] as const
type Level = (typeof LEVELS)[number]

interface UsageRow {
  created_at: string | null
  provider: Provider | string | null
  operation: string | null
  cost_usd: number | string | null
  session_id: string | null
}

interface OperationRow {
  operation: string
  calls: number
  avgCost: number
  totalCost: number
  pctOfTotal: number
}

interface TopSessionRow {
  sessionId: string
  email: string | null
  module: string | null
  level: string | null
  costUsd: number
  createdAt: string | null
}

interface LevelRow {
  level: Level
  sessionCount: number
  avgCostUsd: number
}

interface AiCostsBlock {
  providerDaily: ProviderDaily[]
  providerSummary: ProviderSummary[]
  operations: OperationRow[]
  topSessions: TopSessionRow[]
  byLevel: LevelRow[]
}

function toNumber(v: number | string | null): number {
  if (v === null) return 0
  return typeof v === 'number' ? v : Number(v)
}

function toIsoDay(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

async function loadAiCostsBlock(periodDays: number): Promise<AiCostsBlock> {
  const supabase = createAdminClient()

  const now = new Date()
  const sinceMs = now.getTime() - periodDays * 24 * 60 * 60 * 1000
  const since = new Date(sinceMs)

  const [rowsRes, topSessionsUsageRes] = await Promise.all([
    supabase
      .from('ai_usage_log')
      .select('created_at, provider, operation, cost_usd, session_id')
      .gte('created_at', since.toISOString()),
    supabase
      .from('ai_usage_log')
      .select('session_id, cost_usd, created_at')
      .not('session_id', 'is', null),
  ])

  const rows = (rowsRes.data ?? []) as UsageRow[]

  const dayIndex = new Map<string, ProviderDaily>()
  const providerTotals = new Map<Provider, number>()
  for (const p of PROVIDERS) providerTotals.set(p, 0)

  for (let i = periodDays; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const day = d.toISOString().slice(0, 10)
    dayIndex.set(day, { day, anthropic: 0, elevenlabs: 0, openai: 0 })
  }

  let providerGrandTotal = 0
  for (const row of rows) {
    const day = toIsoDay(row.created_at)
    const prov = row.provider as Provider | null
    const cost = toNumber(row.cost_usd)
    if (!day || !prov || !PROVIDERS.includes(prov)) continue
    const daily = dayIndex.get(day)
    if (daily) {
      daily[prov] = (daily[prov] ?? 0) + cost
    }
    providerTotals.set(prov, (providerTotals.get(prov) ?? 0) + cost)
    providerGrandTotal += cost
  }

  const providerDaily = Array.from(dayIndex.values()).sort((a, b) =>
    a.day < b.day ? -1 : a.day > b.day ? 1 : 0
  )
  const providerSummary: ProviderSummary[] = PROVIDERS.map((p) => {
    const totalUsd = providerTotals.get(p) ?? 0
    return {
      provider: p,
      label: PROVIDER_LABELS[p],
      totalUsd,
      pctOfTotal: providerGrandTotal > 0 ? (totalUsd / providerGrandTotal) * 100 : 0,
    }
  }).sort((a, b) => b.totalUsd - a.totalUsd)

  const opMap = new Map<string, { calls: number; total: number }>()
  let opGrandTotal = 0
  for (const row of rows) {
    const op = row.operation
    if (!op) continue
    const cost = toNumber(row.cost_usd)
    const prev = opMap.get(op) ?? { calls: 0, total: 0 }
    prev.calls += 1
    prev.total += cost
    opMap.set(op, prev)
    opGrandTotal += cost
  }
  const operations: OperationRow[] = Array.from(opMap.entries())
    .map(([operation, v]) => ({
      operation,
      calls: v.calls,
      avgCost: v.calls > 0 ? v.total / v.calls : 0,
      totalCost: v.total,
      pctOfTotal: opGrandTotal > 0 ? (v.total / opGrandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.totalCost - a.totalCost)

  const usageBySessionRows = (topSessionsUsageRes.data ?? []) as Array<{
    session_id: string | null
    cost_usd: number | string | null
    created_at: string | null
  }>

  const costBySession = new Map<string, { cost: number; latestCreatedAt: string | null }>()
  for (const row of usageBySessionRows) {
    const id = row.session_id
    if (!id) continue
    const cost = toNumber(row.cost_usd)
    const prev = costBySession.get(id) ?? { cost: 0, latestCreatedAt: null }
    prev.cost += cost
    if (
      row.created_at &&
      (!prev.latestCreatedAt || row.created_at > prev.latestCreatedAt)
    ) {
      prev.latestCreatedAt = row.created_at
    }
    costBySession.set(id, prev)
  }

  let topSessions: TopSessionRow[] = []
  let byLevel: LevelRow[] = LEVELS.map((level) => ({
    level,
    sessionCount: 0,
    avgCostUsd: 0,
  }))

  if (costBySession.size > 0) {
    const sessionIds = Array.from(costBySession.keys())
    const { data: sessions } = await supabase
      .from('exam_sessions')
      .select('id, user_id, mode, level')
      .in('id', sessionIds)

    const sessionInfo = new Map<
      string,
      { userId: string | null; mode: string | null; level: string | null }
    >()
    for (const s of (sessions ?? []) as Array<{
      id: string
      user_id: string | null
      mode: string | null
      level: string | null
    }>) {
      sessionInfo.set(s.id, { userId: s.user_id, mode: s.mode, level: s.level })
    }

    const byLevelBucket = new Map<Level, { sum: number; count: number }>()
    for (const lvl of LEVELS) byLevelBucket.set(lvl, { sum: 0, count: 0 })
    for (const [sid, { cost }] of costBySession) {
      const info = sessionInfo.get(sid)
      const lvl = info?.level as Level | null
      if (lvl && LEVELS.includes(lvl)) {
        const b = byLevelBucket.get(lvl)!
        b.sum += cost
        b.count += 1
      }
    }
    byLevel = LEVELS.map((level) => {
      const b = byLevelBucket.get(level)!
      return {
        level,
        sessionCount: b.count,
        avgCostUsd: b.count > 0 ? b.sum / b.count : 0,
      }
    })

    const userIds = Array.from(
      new Set(
        Array.from(sessionInfo.values())
          .map((info) => info.userId)
          .filter((id): id is string => typeof id === 'string')
      )
    )
    const emailById = new Map<string, string | null>()
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds)
      for (const p of (profiles ?? []) as Array<{ id: string; email: string | null }>) {
        emailById.set(p.id, p.email)
      }
    }

    topSessions = Array.from(costBySession.entries())
      .map(([sid, { cost, latestCreatedAt }]) => {
        const info = sessionInfo.get(sid)
        return {
          sessionId: sid,
          email: info?.userId ? emailById.get(info.userId) ?? null : null,
          module: info?.mode ?? null,
          level: info?.level ?? null,
          costUsd: cost,
          createdAt: latestCreatedAt,
        }
      })
      .sort((a, b) => b.costUsd - a.costUsd)
      .slice(0, 10)
  }

  return { providerDaily, providerSummary, operations, topSessions, byLevel }
}

function formatShortDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function sessionShort(id: string): string {
  return id.slice(0, 8)
}

const PROVIDER_LABEL_MAP: Record<'anthropic' | 'openai' | 'elevenlabs', string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  elevenlabs: 'ElevenLabs',
}

const FIXED_CATEGORY_LABELS: Record<string, string> = {
  hosting: 'Хостинг',
  database: 'База данных',
  cdn: 'CDN',
  email: 'Email',
  ai_subscription: 'AI-подписка',
  domain: 'Домен',
  other: 'Прочее',
}

const FIXED_PERIOD_LABELS: Record<string, string> = {
  monthly: 'мес',
  yearly: 'год',
  one_time: 'разово',
}

interface PageProps {
  searchParams?: { period?: string | string[] }
}

export default async function AdminEconomyPage({ searchParams }: PageProps) {
  await requireAdminPage('/admin/economy')
  const period: EconomyPeriod = parsePeriod(searchParams?.period)
  const periodDays = periodToDays(period)

  const [revenue, profit, balances, monthlyFixedUsd, fixedList, aiCosts] =
    await Promise.all([
      getRevenue(periodDays),
      getProfit(periodDays),
      getAllProviderBalances(),
      getMonthlyFixedCostsUsd(),
      listFixedCosts(),
      loadAiCostsBlock(periodDays),
    ])

  const periodFactor = periodDays / 30
  const profitNetClass = profit.profitNetUsd >= 0 ? 'text-emerald-600' : 'text-red-600'

  const balanceByProvider = new Map(balances.map((b) => [b.provider, b]))

  return (
    <div className="max-w-6xl space-y-14">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Economy · {periodLabel(period)}
        </div>
        <div className="mt-3 flex items-end justify-between gap-6">
          <h1 className="font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
            Юнит-экономика.
            <br />
            <span className="text-ink-soft">Где деньги.</span>
          </h1>
          <PeriodSelector current={period} />
        </div>
      </header>

      {/* Section 1: Доходы */}
      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Доходы за {periodLabel(period)}
        </h2>
        <h3 className="mb-6 font-display text-3xl leading-tight tracking-tight text-ink">
          Сколько заработали.
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <article className="rounded-rad border border-line bg-card p-6">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
              RU выручка · Точка
            </div>
            <div className="mt-3 font-display text-3xl tabular-nums tracking-tight text-ink">
              {formatRub(revenue.ru.gross)}
            </div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted tabular-nums">
              net {formatRub(revenue.ru.net)} · после 3% Точки
            </div>
            <div className="mt-3 font-mono text-[11px] uppercase tracking-wider text-muted tabular-nums">
              {formatInteger(revenue.ru.paymentsCount)} платежей · {formatInteger(revenue.ru.modulesSold)} модулей
            </div>
          </article>

          <article className="rounded-rad border border-line bg-card p-6">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
              EU выручка · Prodamus
            </div>
            <div className="mt-3 font-display text-3xl tabular-nums tracking-tight text-ink">
              {formatEur(revenue.eu.gross)}
            </div>
            {revenue.eu.gross === 0 ? (
              <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted">
                эквайринг ещё не подключён
              </div>
            ) : (
              <>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted tabular-nums">
                  net {formatEur(revenue.eu.net)} · после 10% Prodamus
                </div>
                <div className="mt-3 font-mono text-[11px] uppercase tracking-wider text-muted tabular-nums">
                  {formatInteger(revenue.eu.paymentsCount)} платежей · {formatInteger(revenue.eu.modulesSold)} модулей
                </div>
              </>
            )}
          </article>

          <article className="rounded-rad border border-line bg-ink p-6 text-page">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-on-dark opacity-70">
              Итого в USD
            </div>
            <div className="mt-3 font-display text-3xl tabular-nums tracking-tight text-page">
              {formatUsd(revenue.total.grossUsd)}
            </div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-page/70 tabular-nums">
              net {formatUsd(revenue.total.netUsd)}
            </div>
            <div className="mt-3 font-mono text-[11px] uppercase tracking-wider text-page/70 tabular-nums">
              {formatInteger(revenue.total.paymentsCount)} платежей · {formatInteger(revenue.total.modulesSold)} модулей
            </div>
          </article>
        </div>

        <div className="mt-6">
          <RevenueChart daily={revenue.daily} />
        </div>
      </section>

      {/* Section 2: Прибыль */}
      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Прибыль и маржа
        </h2>
        <h3 className="mb-6 font-display text-3xl leading-tight tracking-tight text-ink">
          Что осталось после расходов.
        </h3>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <article className="rounded-rad border border-line bg-card p-6">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Выручка net
            </div>
            <div className="mt-3 font-display text-3xl tabular-nums tracking-tight text-ink">
              {formatUsd(profit.revenueNetUsd)}
            </div>
          </article>
          <article className="rounded-rad border border-line bg-card p-6">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
              AI-расходы
            </div>
            <div className="mt-3 font-display text-3xl tabular-nums tracking-tight text-ink">
              −{formatUsd(profit.aiCostsUsd)}
            </div>
          </article>
          <article className="rounded-rad border border-line bg-card p-6">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Постоянные
            </div>
            <div className="mt-3 font-display text-3xl tabular-nums tracking-tight text-ink">
              −{formatUsd(profit.fixedCostsUsd)}
            </div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted tabular-nums">
              {formatUsd(monthlyFixedUsd)}/мес × {periodFactor.toFixed(2)}
            </div>
          </article>
          <article className="rounded-rad border border-line bg-card p-6">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Прибыль net
            </div>
            <div className={`mt-3 font-display text-3xl tabular-nums tracking-tight ${profitNetClass}`}>
              {formatUsd(profit.profitNetUsd)}
            </div>
          </article>
        </div>

        <div className="mt-6 flex items-baseline gap-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Маржа net
          </span>
          <span className={`font-display text-5xl tabular-nums tracking-tight ${profitNetClass}`}>
            {formatPercent(profit.marginNetPercent)}
          </span>
        </div>
        {profit.profitNetUsd < 0 && (
          <p className="mt-2 text-sm text-muted">
            До запуска эквайринга это нормально — выручки почти нет, а AI и инфра уже работают.
          </p>
        )}
      </section>

      {/* Section 3: Расход по AI-провайдерам */}
      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Расход по AI-провайдерам · {periodLabel(period)}
        </h2>
        <h3 className="mb-6 font-display text-3xl leading-tight tracking-tight text-ink">
          Где накапливается стоимость.
        </h3>

        <ProviderCostChart daily={aiCosts.providerDaily} />

        <div className="mt-6 overflow-hidden rounded-rad border border-line bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface">
              <tr className="font-mono text-[10px] uppercase tracking-widest text-muted">
                <th className="px-4 py-3 text-left font-normal">Провайдер</th>
                <th className="px-4 py-3 text-right font-normal">
                  Расход · {periodLabel(period)}
                </th>
                <th className="px-4 py-3 text-right font-normal">% от общего</th>
              </tr>
            </thead>
            <tbody>
              {aiCosts.providerSummary.map((p) => {
                const isZero = p.totalUsd === 0
                return (
                  <tr
                    key={p.provider}
                    className="border-b border-line-soft last:border-0"
                  >
                    <td className="px-4 py-3 text-ink">{p.label}</td>
                    <td
                      className={`px-4 py-3 text-right font-mono text-sm tabular-nums ${
                        isZero ? 'text-muted' : 'text-ink'
                      }`}
                    >
                      {formatUsd(p.totalUsd)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted">
                      <div>{formatPercent(p.pctOfTotal)}</div>
                      {isZero && (
                        <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted">
                          нет вызовов за период
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 4: Балансы провайдеров — ручной ввод */}
      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Балансы AI-провайдеров
        </h2>
        <h3 className="mb-2 font-display text-3xl leading-tight tracking-tight text-ink">
          Сколько осталось на счетах.
        </h3>
        <p className="mb-6 text-sm text-muted">
          Обновляйте после каждого пополнения. Расход за 30 дней — из нашего лога вызовов.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(['anthropic', 'openai', 'elevenlabs'] as const).map((provider) => {
            const card = balanceByProvider.get(provider)
            if (!card) return null
            return (
              <BalanceCardClient
                key={provider}
                provider={provider}
                label={PROVIDER_LABEL_MAP[provider]}
                manualBalanceUsd={card.manualBalanceUsd}
                manualUpdatedAt={card.manualUpdatedAt ? card.manualUpdatedAt.toISOString() : null}
                manualUpdatedBy={null}
                spent30dUsd={card.spent30dUsd}
                spentLast24hUsd={card.spentLast24hUsd}
              />
            )
          })}
        </div>
      </section>

      {/* Section 5: Постоянные расходы (превью) */}
      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Постоянные расходы · {formatUsd(monthlyFixedUsd)}/мес
        </h2>
        <h3 className="mb-6 font-display text-3xl leading-tight tracking-tight text-ink">
          Что мы платим каждый месяц.
        </h3>

        <div className="overflow-hidden rounded-rad border border-line bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface">
              <tr className="font-mono text-[10px] uppercase tracking-widest text-muted">
                <th className="px-4 py-3 text-left font-normal">Сервис</th>
                <th className="px-4 py-3 text-left font-normal">Категория</th>
                <th className="px-4 py-3 text-right font-normal">Сумма</th>
                <th className="px-4 py-3 text-left font-normal">Период</th>
              </tr>
            </thead>
            <tbody>
              {fixedList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center font-mono text-xs text-muted">
                    Расходов ещё нет.
                  </td>
                </tr>
              ) : (
                fixedList.map((row) => (
                  <tr key={row.id} className="border-b border-line-soft last:border-0">
                    <td className="px-4 py-3 text-ink">{row.name}</td>
                    <td className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted">
                      {FIXED_CATEGORY_LABELS[row.category] ?? row.category}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-ink">
                      {formatNative(row.amountNative, row.nativeCurrency)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted">
                      {FIXED_PERIOD_LABELS[row.period] ?? row.period}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Link
          href="/admin/fixed-costs"
          className="mt-4 inline-block font-mono text-[11px] uppercase tracking-wider text-muted underline-offset-2 transition-colors hover:text-ink hover:underline"
        >
          Управлять постоянными расходами →
        </Link>
      </section>

      {/* Section 6: Себестоимость по уровням */}
      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Себестоимость по уровням
        </h2>
        <h3 className="mb-6 font-display text-3xl leading-tight tracking-tight text-ink">
          A1 / A2 / B1 — где дороже.
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {aiCosts.byLevel.map((row) => {
            const enough = row.sessionCount >= 3
            return (
              <div key={row.level} className="rounded-rad border border-line bg-card p-6">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  {row.level}
                </div>
                <div
                  className={`mt-3 font-display text-4xl tracking-tight tabular-nums ${
                    enough ? 'text-ink' : 'text-muted'
                  }`}
                >
                  {enough ? formatUsd(row.avgCostUsd) : '—'}
                </div>
                <div className="mt-2 font-mono text-[11px] uppercase tracking-wider text-muted tabular-nums">
                  {enough
                    ? `из ${row.sessionCount} сессий`
                    : row.sessionCount > 0
                      ? `всего ${row.sessionCount} — недостаточно данных`
                      : 'нет данных'}
                </div>
              </div>
            )
          })}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          B1 обычно дороже, чем A1 — более длинные тексты и сложная оценка. Карточка показывает «—»,
          если на уровне меньше 3 тестов за период.
        </p>
      </section>

      {/* Operations table (extra) */}
      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Расход по типам операций · {periodLabel(period)}
        </h2>
        <div className="overflow-hidden rounded-rad border border-line bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface">
              <tr className="font-mono text-[10px] uppercase tracking-widest text-muted">
                <th className="px-4 py-3 text-left font-normal">Операция</th>
                <th className="px-4 py-3 text-right font-normal">Вызовов</th>
                <th className="px-4 py-3 text-right font-normal">Средняя</th>
                <th className="px-4 py-3 text-right font-normal">Всего</th>
                <th className="px-4 py-3 text-right font-normal">% от общего</th>
              </tr>
            </thead>
            <tbody>
              {aiCosts.operations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center font-mono text-xs text-muted">
                    За период операций не было.
                  </td>
                </tr>
              ) : (
                aiCosts.operations.map((op) => (
                  <tr key={op.operation} className="border-b border-line-soft last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-ink">{op.operation}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-ink">
                      {formatInteger(op.calls)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted">
                      {formatUsd(op.avgCost)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-ink">
                      {formatUsd(op.totalCost)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted">
                      {formatPercent(op.pctOfTotal)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Top sessions */}
      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Топ-10 дорогих сессий
        </h2>
        <div className="overflow-hidden rounded-rad border border-line bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface">
              <tr className="font-mono text-[10px] uppercase tracking-widest text-muted">
                <th className="px-4 py-3 text-left font-normal">Дата</th>
                <th className="px-4 py-3 text-left font-normal">Email</th>
                <th className="px-4 py-3 text-left font-normal">Модуль</th>
                <th className="px-4 py-3 text-left font-normal">Уровень</th>
                <th className="px-4 py-3 text-right font-normal">Стоимость</th>
              </tr>
            </thead>
            <tbody>
              {aiCosts.topSessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center font-mono text-xs text-muted">
                    Пока пусто.
                  </td>
                </tr>
              ) : (
                aiCosts.topSessions.map((row) => (
                  <tr
                    key={row.sessionId}
                    className="border-b border-line-soft last:border-0 hover:bg-surface/50"
                  >
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-muted">
                      {formatShortDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink">
                      {row.email ?? <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-ink">{row.module ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs uppercase tabular-nums text-muted">
                      {row.level ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-ink">
                      {formatUsd(row.costUsd)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {aiCosts.topSessions.length > 0 && (
          <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-muted">
            Показано {aiCosts.topSessions.length} (id первой: {sessionShort(aiCosts.topSessions[0].sessionId)})
            · обновлено {formatEditorialDate(new Date())}
          </p>
        )}
      </section>
    </div>
  )
}
