/**
 * Прибыль и маржа за период.
 *
 *   AI-расходы — SUM(ai_usage_log.cost_usd) за период.
 *   Fixed-расходы — пропорция getMonthlyFixedCostsUsd() × periodDays/30.
 *   profit_gross = revenue_gross − ai_costs − fixed_costs
 *   profit_net   = revenue_net   − ai_costs − fixed_costs
 *
 * При нулевой выручке маржа возвращается 0 (а не NaN/Infinity).
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { getRevenue } from './revenue'
import { getMonthlyFixedCostsUsd } from './fixed-costs'

export interface ProfitSummary {
  periodDays: number
  revenueGrossUsd: number
  revenueNetUsd: number
  aiCostsUsd: number
  fixedCostsUsd: number
  profitGrossUsd: number
  profitNetUsd: number
  marginGrossPercent: number
  marginNetPercent: number
}

interface CostRow {
  cost_usd: number | string | null
}

async function getAiCostsUsd(periodDays: number): Promise<number> {
  const supabase = createAdminClient()
  const sinceIso = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('ai_usage_log')
    .select('cost_usd')
    .gte('created_at', sinceIso)
  if (!data) return 0
  return (data as CostRow[]).reduce((acc, row) => acc + Number(row.cost_usd ?? 0), 0)
}

export async function getProfit(periodDays: number): Promise<ProfitSummary> {
  const [revenue, aiCosts, monthlyFixed] = await Promise.all([
    getRevenue(periodDays),
    getAiCostsUsd(periodDays),
    getMonthlyFixedCostsUsd(),
  ])

  const fixedCostsUsd = monthlyFixed * (periodDays / 30)
  const revenueGrossUsd = revenue.total.grossUsd
  const revenueNetUsd = revenue.total.netUsd
  const profitGrossUsd = revenueGrossUsd - aiCosts - fixedCostsUsd
  const profitNetUsd = revenueNetUsd - aiCosts - fixedCostsUsd

  return {
    periodDays,
    revenueGrossUsd,
    revenueNetUsd,
    aiCostsUsd: aiCosts,
    fixedCostsUsd,
    profitGrossUsd,
    profitNetUsd,
    marginGrossPercent: revenueGrossUsd > 0 ? (profitGrossUsd / revenueGrossUsd) * 100 : 0,
    marginNetPercent: revenueNetUsd > 0 ? (profitNetUsd / revenueNetUsd) * 100 : 0,
  }
}
