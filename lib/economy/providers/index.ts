/**
 * Единая точка сбора балансов AI-провайдеров для админки.
 *
 * Anthropic — расходы только из ai_usage_log; баланс ручной (нет публичного API).
 * OpenAI    — расходы из ai_usage_log + сверка с Costs API; баланс ручной.
 * ElevenLabs — баланс автоматический через subscription endpoint;
 *              расходы из ai_usage_log.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { getElevenLabsBalance } from './elevenlabs'
import { getOpenAiCosts } from './openai'

export type ProviderId = 'anthropic' | 'openai' | 'elevenlabs'

export interface ElevenLabsAutoDetails {
  charactersUsed: number
  charactersTotal: number
  tier: string
  status: string
  nextResetAt: Date | null
}

export interface ProviderBalanceCard {
  provider: ProviderId
  automaticBalanceUsd: number | null
  automaticDetails: ElevenLabsAutoDetails | null
  manualBalanceUsd: number | null
  manualUpdatedAt: Date | null
  spent30dUsd: number
  spentLast24hUsd: number
  automaticSpent30dUsd: number | null
}

interface UsageSpentRow {
  cost_usd: number | string | null
}

async function loadSpentForProvider(
  provider: ProviderId,
  sinceIso: string
): Promise<number> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('ai_usage_log')
    .select('cost_usd')
    .eq('provider', provider)
    .gte('created_at', sinceIso)

  if (!data) return 0
  return (data as UsageSpentRow[]).reduce((acc, row) => acc + Number(row.cost_usd ?? 0), 0)
}

interface ManualBalanceRow {
  balance_usd: number | string
  recorded_at: string
}

async function loadLatestManualBalance(
  provider: ProviderId
): Promise<{ balanceUsd: number; recordedAt: Date } | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('provider_balances_manual')
    .select('balance_usd, recorded_at')
    .eq('provider', provider)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  const row = data as ManualBalanceRow
  return {
    balanceUsd: Number(row.balance_usd),
    recordedAt: new Date(row.recorded_at),
  }
}

async function buildProviderCard(provider: ProviderId): Promise<ProviderBalanceCard> {
  const now = Date.now()
  const since30dIso = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
  const since24hIso = new Date(now - 24 * 60 * 60 * 1000).toISOString()

  const [spent30d, spentLast24h, manual] = await Promise.all([
    loadSpentForProvider(provider, since30dIso),
    loadSpentForProvider(provider, since24hIso),
    loadLatestManualBalance(provider),
  ])

  const card: ProviderBalanceCard = {
    provider,
    automaticBalanceUsd: null,
    automaticDetails: null,
    manualBalanceUsd: manual?.balanceUsd ?? null,
    manualUpdatedAt: manual?.recordedAt ?? null,
    spent30dUsd: spent30d,
    spentLast24hUsd: spentLast24h,
    automaticSpent30dUsd: null,
  }

  if (provider === 'elevenlabs') {
    const balance = await getElevenLabsBalance()
    if (balance) {
      card.automaticBalanceUsd = balance.estimatedRemainingUsd
      card.automaticDetails = {
        charactersUsed: balance.charactersUsed,
        charactersTotal: balance.charactersTotal,
        tier: balance.tier,
        status: balance.status,
        nextResetAt: balance.nextResetAt,
      }
    }
  } else if (provider === 'openai') {
    const costs = await getOpenAiCosts()
    if (costs) {
      card.automaticSpent30dUsd = costs.total30dUsd
    }
  }

  return card
}

export async function getAllProviderBalances(): Promise<ProviderBalanceCard[]> {
  return Promise.all([
    buildProviderCard('anthropic'),
    buildProviderCard('openai'),
    buildProviderCard('elevenlabs'),
  ])
}

export { getElevenLabsBalance } from './elevenlabs'
export { getOpenAiCosts } from './openai'
export type { ElevenLabsBalance } from './elevenlabs'
export type { OpenAiCostsSummary, OpenAiCostBucket } from './openai'
