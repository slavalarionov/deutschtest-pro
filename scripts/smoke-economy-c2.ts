/* eslint-disable no-console */
/**
 * Smoke-тест второго слоя бэкенда экономики:
 *   providers/* (ElevenLabs / OpenAI / unified)
 *   revenue.ts, profit.ts, dashboard-kpi.ts
 *
 * Запуск: npx tsx --env-file=.env.local scripts/smoke-economy-c2.ts
 * Ничего не падает: каждый блок в try/catch, выводит "✓ OK" или "✗ FAIL".
 */
import {
  getElevenLabsBalance,
  __resetElevenLabsBalanceCacheForTests,
} from '../lib/economy/providers/elevenlabs'
import {
  getOpenAiCosts,
  __resetOpenAiCostsCacheForTests,
} from '../lib/economy/providers/openai'
import { getAllProviderBalances } from '../lib/economy/providers'
import { getRevenue } from '../lib/economy/revenue'
import { getProfit } from '../lib/economy/profit'
import { getDashboardKPI } from '../lib/economy/dashboard-kpi'

let failures = 0

async function check(label: string, fn: () => Promise<unknown>) {
  try {
    const result = await fn()
    console.log(`✓ ${label}: OK`)
    if (result !== undefined) {
      const preview =
        typeof result === 'string'
          ? result
          : JSON.stringify(result, jsonReplacer, 2).slice(0, 1200)
      console.log(`  → ${preview}`)
    }
  } catch (err) {
    failures += 1
    console.log(`✗ ${label}: FAIL — ${err instanceof Error ? err.message : String(err)}`)
  }
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'number') return Number(value.toFixed(4))
  return value
}

async function main() {
  __resetElevenLabsBalanceCacheForTests()
  __resetOpenAiCostsCacheForTests()

  await check('getElevenLabsBalance()', async () => {
    const b = await getElevenLabsBalance()
    if (b === null) return '(null — proxy/key not configured locally — OK if expected)'
    return {
      tier: b.tier,
      status: b.status,
      used: b.charactersUsed,
      total: b.charactersTotal,
      remainingUsd: Number(b.estimatedRemainingUsd.toFixed(4)),
    }
  })

  await check('getOpenAiCosts()', async () => {
    const c = await getOpenAiCosts()
    if (c === null) return '(null — admin key missing or 401)'
    return {
      total30dUsd: Number(c.total30dUsd.toFixed(4)),
      total7dUsd: Number(c.total7dUsd.toFixed(4)),
      today24hUsd: Number(c.today24hUsd.toFixed(4)),
      bucketsCount: c.daily.length,
    }
  })

  await check('getAllProviderBalances()', async () => {
    const cards = await getAllProviderBalances()
    return cards.map((c) => ({
      provider: c.provider,
      automatic: c.automaticBalanceUsd,
      manual: c.manualBalanceUsd,
      spent30d: Number(c.spent30dUsd.toFixed(4)),
      spent24h: Number(c.spentLast24hUsd.toFixed(4)),
      automaticSpent30d: c.automaticSpent30dUsd,
    }))
  })

  await check('getRevenue(30)', async () => {
    const r = await getRevenue(30)
    return {
      ru: { ...r.ru, grossUsd: Number(r.ru.grossUsd.toFixed(2)), netUsd: Number(r.ru.netUsd.toFixed(2)) },
      eu: { ...r.eu, grossUsd: Number(r.eu.grossUsd.toFixed(2)), netUsd: Number(r.eu.netUsd.toFixed(2)) },
      total: {
        grossUsd: Number(r.total.grossUsd.toFixed(2)),
        netUsd: Number(r.total.netUsd.toFixed(2)),
        paymentsCount: r.total.paymentsCount,
        modulesSold: r.total.modulesSold,
      },
      dailyDays: r.daily.length,
    }
  })

  await check('getProfit(30)', async () => {
    const p = await getProfit(30)
    return {
      revenueGrossUsd: Number(p.revenueGrossUsd.toFixed(2)),
      revenueNetUsd: Number(p.revenueNetUsd.toFixed(2)),
      aiCostsUsd: Number(p.aiCostsUsd.toFixed(4)),
      fixedCostsUsd: Number(p.fixedCostsUsd.toFixed(2)),
      profitGrossUsd: Number(p.profitGrossUsd.toFixed(2)),
      profitNetUsd: Number(p.profitNetUsd.toFixed(2)),
      marginGrossPercent: Number(p.marginGrossPercent.toFixed(1)),
      marginNetPercent: Number(p.marginNetPercent.toFixed(1)),
    }
  })

  await check('getDashboardKPI()', async () => {
    const k = await getDashboardKPI()
    return {
      revenue30d: {
        grossUsd: Number(k.revenue30d.grossUsd.toFixed(2)),
        netUsd: Number(k.revenue30d.netUsd.toFixed(2)),
        ru: Number(k.revenue30d.ru.toFixed(2)),
        eu: Number(k.revenue30d.eu.toFixed(2)),
      },
      profit30d: {
        grossUsd: Number(k.profit30d.grossUsd.toFixed(2)),
        netUsd: Number(k.profit30d.netUsd.toFixed(2)),
        marginPercent: Number(k.profit30d.marginPercent.toFixed(1)),
      },
      aiCostPerModule: k.aiCostPerModule != null ? Number(k.aiCostPerModule.toFixed(4)) : null,
      payingConversion: Number(k.payingConversion.toFixed(2)),
      mrr: Number(k.mrr.toFixed(2)),
    }
  })

  if (failures > 0) {
    console.log(`\n✗ ${failures} smoke check(s) failed`)
    process.exit(1)
  } else {
    console.log('\n✓ all smoke checks passed')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
