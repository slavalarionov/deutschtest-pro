/**
 * CRUD для ручных полей админки:
 *  - provider_balances_manual: история ручных вводов балансов AI-провайдеров
 *  - fixed_costs: создание / редактирование / окончание (soft-end) расходов
 *
 * Все функции работают через service_role (createAdminClient).
 * Вызывающий код (Server Action или /api/admin/* route) обязан проверить
 * requireAdminApi() / requireAdminPage() — здесь авторизация не дублируется.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { FixedCost, FixedCostCategory, FixedCostCurrency, FixedCostPeriod } from './fixed-costs'

export type ProviderForBalance = 'anthropic' | 'openai' | 'elevenlabs'

export interface ProviderBalanceRecord {
  balanceUsd: number
  recordedAt: Date
  notes: string | null
  recordedBy: string | null
}

interface ProviderBalanceRow {
  balance_usd: number | string
  recorded_at: string
  notes: string | null
  recorded_by: string | null
}

function rowToProviderBalance(row: ProviderBalanceRow): ProviderBalanceRecord {
  return {
    balanceUsd: Number(row.balance_usd),
    recordedAt: new Date(row.recorded_at),
    notes: row.notes,
    recordedBy: row.recorded_by,
  }
}

export async function recordProviderBalance(input: {
  provider: ProviderForBalance
  balanceUsd: number
  notes?: string
  recordedBy?: string
}): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('provider_balances_manual').insert({
    provider: input.provider,
    balance_usd: input.balanceUsd,
    notes: input.notes ?? null,
    recorded_by: input.recordedBy ?? null,
  })
  if (error) throw new Error(`recordProviderBalance: ${error.message}`)
}

export async function getLatestProviderBalance(
  provider: ProviderForBalance
): Promise<ProviderBalanceRecord | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('provider_balances_manual')
    .select('balance_usd, recorded_at, notes, recorded_by')
    .eq('provider', provider)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return rowToProviderBalance(data as ProviderBalanceRow)
}

export async function listProviderBalanceHistory(
  provider: ProviderForBalance,
  limit = 20
): Promise<ProviderBalanceRecord[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('provider_balances_manual')
    .select('balance_usd, recorded_at, notes, recorded_by')
    .eq('provider', provider)
    .order('recorded_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return (data as ProviderBalanceRow[]).map(rowToProviderBalance)
}

// ───────────── fixed_costs ─────────────

export interface CreateFixedCostInput {
  name: string
  amountNative: number
  nativeCurrency: FixedCostCurrency
  period: FixedCostPeriod
  category: FixedCostCategory
  startedAt?: string
  notes?: string
}

export interface UpdateFixedCostInput {
  name?: string
  amountNative?: number
  nativeCurrency?: FixedCostCurrency
  period?: FixedCostPeriod
  category?: FixedCostCategory
  notes?: string | null
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

export async function createFixedCost(input: CreateFixedCostInput): Promise<FixedCost> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('fixed_costs')
    .insert({
      name: input.name,
      amount_native: input.amountNative,
      native_currency: input.nativeCurrency,
      period: input.period,
      category: input.category,
      started_at: input.startedAt ?? new Date().toISOString().slice(0, 10),
      notes: input.notes ?? null,
    })
    .select('*')
    .single()

  if (error || !data) throw new Error(`createFixedCost: ${error?.message ?? 'unknown'}`)
  return rowToFixedCost(data as FixedCostRow)
}

export async function updateFixedCost(
  id: string,
  input: UpdateFixedCostInput
): Promise<void> {
  const supabase = createAdminClient()
  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.amountNative !== undefined) patch.amount_native = input.amountNative
  if (input.nativeCurrency !== undefined) patch.native_currency = input.nativeCurrency
  if (input.period !== undefined) patch.period = input.period
  if (input.category !== undefined) patch.category = input.category
  if (input.notes !== undefined) patch.notes = input.notes

  if (Object.keys(patch).length === 0) return

  const { error } = await supabase.from('fixed_costs').update(patch).eq('id', id)
  if (error) throw new Error(`updateFixedCost: ${error.message}`)
}

export async function endFixedCost(id: string, endedAt: Date): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('fixed_costs')
    .update({ ended_at: endedAt.toISOString().slice(0, 10) })
    .eq('id', id)
  if (error) throw new Error(`endFixedCost: ${error.message}`)
}

export async function listAllFixedCosts(includeEnded = false): Promise<FixedCost[]> {
  const supabase = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  let query = supabase.from('fixed_costs').select('*')
  if (!includeEnded) {
    query = query.or(`ended_at.is.null,ended_at.gt.${today}`)
  }

  const { data, error } = await query
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error || !data) return []
  return (data as FixedCostRow[]).map(rowToFixedCost)
}
