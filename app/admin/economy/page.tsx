import { requireAdminPage } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProviderCostChart, type ProviderDaily, type ProviderSummary } from './cost-chart'

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

interface EconomyData {
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

async function loadEconomyData(): Promise<EconomyData> {
  const supabase = createAdminClient()

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [rowsRes, topSessionsUsageRes] = await Promise.all([
    supabase
      .from('ai_usage_log')
      .select('created_at, provider, operation, cost_usd, session_id')
      .gte('created_at', thirtyDaysAgo.toISOString()),
    supabase
      .from('ai_usage_log')
      .select('session_id, cost_usd, created_at')
      .not('session_id', 'is', null),
  ])

  const rows = (rowsRes.data ?? []) as UsageRow[]

  // --- Section 1: provider daily + summary -----------------------------
  const dayIndex = new Map<string, ProviderDaily>()
  const providerTotals = new Map<Provider, number>()
  for (const p of PROVIDERS) providerTotals.set(p, 0)

  // Pre-seed 30 days so the chart has continuous X even for zero days.
  for (let i = 30; i >= 0; i--) {
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
      daily[prov] += cost
    }
    providerTotals.set(prov, (providerTotals.get(prov) ?? 0) + cost)
    providerGrandTotal += cost
  }

  const providerDaily = Array.from(dayIndex.values())

  const providerSummary: ProviderSummary[] = PROVIDERS.map((p) => {
    const total = providerTotals.get(p) ?? 0
    return {
      provider: p,
      label: PROVIDER_LABELS[p],
      totalUsd: total,
      pctOfTotal: providerGrandTotal > 0 ? (total / providerGrandTotal) * 100 : 0,
    }
  })

  // --- Section 2: operations -------------------------------------------
  const opMap = new Map<string, { calls: number; total: number }>()
  for (const row of rows) {
    const op = row.operation
    if (!op) continue
    const b = opMap.get(op) ?? { calls: 0, total: 0 }
    b.calls += 1
    b.total += toNumber(row.cost_usd)
    opMap.set(op, b)
  }
  const operations: OperationRow[] = Array.from(opMap.entries())
    .map(([operation, { calls, total }]) => ({
      operation,
      calls,
      avgCost: calls > 0 ? total / calls : 0,
      totalCost: total,
      pctOfTotal: providerGrandTotal > 0 ? (total / providerGrandTotal) * 100 : 0,
    }))
    .filter((op) => op.calls > 0)
    .sort((a, b) => b.totalCost - a.totalCost)

  // --- Sections 3 + 4: require session_id --------------------------------
  const costBySession = new Map<
    string,
    { cost: number; latestCreatedAt: string | null }
  >()
  for (const row of (topSessionsUsageRes.data ?? []) as Array<{
    session_id: string | null
    cost_usd: number | string | null
    created_at: string | null
  }>) {
    const sid = row.session_id
    if (!sid) continue
    const existing = costBySession.get(sid) ?? { cost: 0, latestCreatedAt: null }
    existing.cost += toNumber(row.cost_usd)
    if (
      row.created_at &&
      (!existing.latestCreatedAt || row.created_at > existing.latestCreatedAt)
    ) {
      existing.latestCreatedAt = row.created_at
    }
    costBySession.set(sid, existing)
  }

  let topSessions: TopSessionRow[] = []
  let byLevel: LevelRow[] = LEVELS.map((level) => ({
    level,
    sessionCount: 0,
    avgCostUsd: 0,
  }))

  if (costBySession.size > 0) {
    const sessionIds = Array.from(costBySession.keys())
    const { data: sessionRows } = await supabase
      .from('exam_sessions')
      .select('id, user_id, mode, level')
      .in('id', sessionIds)

    const byLevelBucket = new Map<Level, { sum: number; count: number }>()
    for (const lvl of LEVELS) byLevelBucket.set(lvl, { sum: 0, count: 0 })

    const sessionInfo = new Map<
      string,
      { userId: string | null; mode: string | null; level: string | null }
    >()
    for (const s of (sessionRows ?? []) as Array<{
      id: string
      user_id: string | null
      mode: string | null
      level: string | null
    }>) {
      sessionInfo.set(s.id, { userId: s.user_id, mode: s.mode, level: s.level })
      if (LEVELS.includes(s.level as Level)) {
        const b = byLevelBucket.get(s.level as Level)!
        const cost = costBySession.get(s.id)?.cost ?? 0
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
          .filter((id): id is string => typeof id === 'string'),
      ),
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

  return {
    providerDaily,
    providerSummary,
    operations,
    topSessions,
    byLevel,
  }
}

function formatUsd(value: number, digits = 2): string {
  return `$${value.toFixed(digits)}`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function sessionShort(id: string): string {
  return id.slice(0, 8)
}

export default async function AdminEconomyPage() {
  await requireAdminPage('/admin/economy')
  const data = await loadEconomyData()

  return (
    <div className="max-w-6xl space-y-14">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Economy
        </div>
        <h1 className="mt-3 font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
          Расходы.
          <br />
          <span className="text-ink-soft">Куда уходят деньги.</span>
        </h1>
      </header>

      {/* Section 1: Provider daily cost */}
      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Расход по провайдерам · 30 дней
        </h2>
        <h3 className="mb-6 font-display text-3xl leading-tight tracking-tight text-ink">
          Где накапливается стоимость.
        </h3>

        <ProviderCostChart daily={data.providerDaily} />

        <div className="mt-6 overflow-hidden rounded-rad border border-line bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface">
              <tr className="font-mono text-[10px] uppercase tracking-widest text-muted">
                <th className="px-4 py-3 text-left font-normal">Провайдер</th>
                <th className="px-4 py-3 text-right font-normal">Расход · 30 д.</th>
                <th className="px-4 py-3 text-right font-normal">% от общего</th>
              </tr>
            </thead>
            <tbody>
              {data.providerSummary.map((p) => {
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
                      <div>{p.pctOfTotal.toFixed(1)}%</div>
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

        <p className="mt-4 text-sm leading-relaxed text-muted">
          Ежедневный расход на каждый AI-провайдер. Anthropic (Claude) — основные расходы на генерацию и оценку.
          ElevenLabs (TTS) — только Hören, большие блоки аудио. OpenAI (Whisper) — только Sprechen, транскрипция
          речи. Резкие всплески обычно означают либо наплыв пользователей, либо баг с ретраями.
        </p>
      </section>

      {/* Section 2: Operations table */}
      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Расход по типам операций · 30 дней
        </h2>
        <h3 className="mb-6 font-display text-3xl leading-tight tracking-tight text-ink">
          Что съедает бюджет.
        </h3>
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
              {data.operations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center font-mono text-xs text-muted">
                    За 30 дней операций не было.
                  </td>
                </tr>
              ) : (
                data.operations.map((op) => (
                  <tr
                    key={op.operation}
                    className="border-b border-line-soft last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-ink">{op.operation}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-ink">
                      {op.calls.toLocaleString('ru-RU')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted">
                      {formatUsd(op.avgCost, 4)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-ink">
                      {formatUsd(op.totalCost)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted">
                      {op.pctOfTotal.toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Какие типы операций (генерация Lesen, TTS Hören, оценка Schreiben и т. д.) съедают больше всего бюджета.
          Помогает понять, где оптимизировать: если <code className="font-mono text-xs">tts_generate</code>{' '}
          доминирует — смотрим на кеш аудио; если <code className="font-mono text-xs">claude_score</code> —
          смотрим на длину промптов.
        </p>
      </section>

      {/* Section 3: Top-10 expensive sessions */}
      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Топ-10 дорогих сессий
        </h2>
        <h3 className="mb-6 font-display text-3xl leading-tight tracking-tight text-ink">
          Самые прожорливые сессии.
        </h3>
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
              {data.topSessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center font-mono text-xs text-muted">
                    Пока пусто.
                  </td>
                </tr>
              ) : (
                data.topSessions.map((row) => (
                  <tr
                    key={row.sessionId}
                    className="border-b border-line-soft last:border-0 hover:bg-surface/50"
                  >
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-muted">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink">
                      {row.email ?? <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-ink">{row.module ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs uppercase tabular-nums text-muted">
                      {row.level ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-ink">
                      {formatUsd(row.costUsd, 3)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Сессии, которые потратили больше всего AI-бюджета. Нормальные сессии стоят $0.10–$0.30. Сессии выше
          $0.50 — возможные аномалии: ретраи из-за ошибок, очень длинные тексты, баги Claude с форматом ответа.
        </p>
        {data.topSessions.length > 0 && (
          <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-muted">
            Показано {data.topSessions.length}.
            {data.topSessions.length > 0 && (
              <span className="ml-2 text-muted">
                (id первой: {sessionShort(data.topSessions[0].sessionId)})
              </span>
            )}
          </p>
        )}
      </section>

      {/* Section 4: By level */}
      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Себестоимость по уровням
        </h2>
        <h3 className="mb-6 font-display text-3xl leading-tight tracking-tight text-ink">
          A1 / A2 / B1 — где дороже.
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {data.byLevel.map((row) => {
            const enough = row.sessionCount >= 3
            return (
              <div
                key={row.level}
                className="rounded-rad border border-line bg-card p-6"
              >
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  {row.level}
                </div>
                <div
                  className={`mt-3 font-display text-4xl tracking-tight tabular-nums ${
                    enough ? 'text-ink' : 'text-muted'
                  }`}
                >
                  {enough ? formatUsd(row.avgCostUsd, 3) : '—'}
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
          B1 обычно дороже, чем A1 — более длинные тексты и сложная оценка. Разница — база для решения,
          дифференцировать ли цену модулей (пока решено не делать). Карточка показывает «—», если на
          уровне меньше 3 тестов за период.
        </p>
      </section>

      {/* Section 5: Revenue placeholder */}
      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Доходы
        </h2>
        <div className="rounded-rad border border-line bg-surface p-6">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Ожидается
          </div>
          <h3 className="mt-2 font-display text-2xl leading-tight tracking-tight text-ink">
            Раздел появится после подключения эквайринга.
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Сейчас платёжных транзакций нет — таблица <code className="font-mono text-xs">payments</code>{' '}
            пустая. Когда Robokassa заработает, здесь будет: общий доход за период, конверсия
            register → оплата, средний чек, маржа по пакетам и отдельная колонка «доход − AI-себестоимость».
          </p>
        </div>
      </section>
    </div>
  )
}
