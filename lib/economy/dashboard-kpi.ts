/**
 * 5 ключевых метрик для главной админки и заголовка раздела «Экономика».
 *
 * Все цифры — за последние 30 дней (rolling). MRR упрощённо приравниваем
 * к выручке за 30 дней net (без отдельной модели подписок).
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { getRevenue } from './revenue'
import { getProfit } from './profit'

export interface DashboardKPI {
  revenue30d: { grossUsd: number; netUsd: number; ru: number; eu: number }
  profit30d: { grossUsd: number; netUsd: number; marginPercent: number }
  aiCostPerModule: number | null
  payingConversion: number
  mrr: number
}

interface ModulesUsedRow {
  delta: number | string | null
}

async function getModulesUsedLast30d(): Promise<number> {
  const supabase = createAdminClient()
  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('modules_ledger')
    .select('delta')
    .lt('delta', 0)
    .gte('created_at', sinceIso)
  if (!data) return 0
  return (data as ModulesUsedRow[]).reduce(
    (acc, row) => acc + Math.abs(Number(row.delta ?? 0)),
    0
  )
}

interface UserIdRow {
  user_id: string | null
}

async function getPayingConversionPercent(): Promise<number> {
  const supabase = createAdminClient()
  const [{ count: totalUsers }, { data: paying }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('payments').select('user_id').eq('status', 'approved'),
  ])

  if (!totalUsers || totalUsers === 0) return 0
  const uniquePaying = new Set(
    (paying as UserIdRow[] | null ?? [])
      .map((row) => row.user_id)
      .filter((id): id is string => typeof id === 'string')
  )
  return (uniquePaying.size / totalUsers) * 100
}

export async function getDashboardKPI(): Promise<DashboardKPI> {
  const [revenue, profit, modulesUsed, payingConversion] = await Promise.all([
    getRevenue(30),
    getProfit(30),
    getModulesUsedLast30d(),
    getPayingConversionPercent(),
  ])

  const aiCostPerModule = modulesUsed > 0 ? profit.aiCostsUsd / modulesUsed : null

  return {
    revenue30d: {
      grossUsd: revenue.total.grossUsd,
      netUsd: revenue.total.netUsd,
      ru: revenue.ru.grossUsd,
      eu: revenue.eu.grossUsd,
    },
    profit30d: {
      grossUsd: profit.profitGrossUsd,
      netUsd: profit.profitNetUsd,
      marginPercent: profit.marginNetPercent,
    },
    aiCostPerModule,
    payingConversion,
    mrr: revenue.total.netUsd,
  }
}
