/**
 * Постоянные расходы — листинг и месячная агрегация в USD.
 *
 * monthly  → amount_usd
 * yearly   → amount_usd / 12
 * one_time → 0 (одноразовые в месячный run-rate не размазываем)
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { convertToUsd } from './exchange-rates'

export type FixedCostPeriod = 'monthly' | 'yearly' | 'one_time'
export type FixedCostCategory =
  | 'hosting'
  | 'database'
  | 'cdn'
  | 'email'
  | 'ai_subscription'
  | 'domain'
  | 'other'
export type FixedCostCurrency = 'USD' | 'RUB' | 'EUR'

export interface FixedCost {
  id: string
  name: string
  amountNative: number
  nativeCurrency: FixedCostCurrency
  period: FixedCostPeriod
  category: FixedCostCategory
  startedAt: string
  endedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface FixedCostRow {
  id: string
  name: string
  amount_native: number | string
  native_currency: FixedCostCurrency
  period: FixedCostPeriod
  category: FixedCostCategory
  started_at: string
  ended_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

function rowToFixedCost(row: FixedCostRow): FixedCost {
  return {
    id: row.id,
    name: row.name,
    amountNative: Number(row.amount_native),
    nativeCurrency: row.native_currency,
    period: row.period,
    category: row.category,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listFixedCosts(): Promise<FixedCost[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('fixed_costs')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error || !data) return []
  return (data as FixedCostRow[]).map(rowToFixedCost)
}

export async function getMonthlyFixedCostsUsd(): Promise<number> {
  const supabase = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('fixed_costs')
    .select('amount_native, native_currency, period, ended_at')
    .or(`ended_at.is.null,ended_at.gt.${today}`)

  if (error || !data) return 0

  let totalUsd = 0
  for (const row of data as Array<Pick<FixedCostRow, 'amount_native' | 'native_currency' | 'period'>>) {
    if (row.period === 'one_time') continue

    const amountUsd = await convertToUsd(Number(row.amount_native), row.native_currency)
    if (row.period === 'monthly') totalUsd += amountUsd
    else if (row.period === 'yearly') totalUsd += amountUsd / 12
  }

  return totalUsd
}
