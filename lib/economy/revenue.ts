/**
 * Выручка по периодам — поверх view revenue_daily (миграция 040).
 *
 * Конверсия в USD идёт через lib/economy/exchange-rates.ts (frankfurter.dev).
 * Net = gross − комиссия эквайринга (Точка 3%, Prodamus 10%).
 *
 * EU-блок будет нулевым, пока Prodamus не подключён — это ожидаемо.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { convertToUsd, getExchangeRate } from './exchange-rates'
import { applyCommission, type AcquirerProvider } from './commissions'

export interface RevenueSide {
  gross: number
  grossUsd: number
  net: number
  netUsd: number
  paymentsCount: number
  modulesSold: number
}

export interface RevenueByPeriod {
  periodDays: number
  ru: RevenueSide
  eu: RevenueSide
  total: {
    grossUsd: number
    netUsd: number
    paymentsCount: number
    modulesSold: number
  }
  daily: Array<{ date: string; grossUsd: number; netUsd: number }>
}

interface RevenueRow {
  day: string
  amount_currency: 'RUB' | 'EUR'
  payment_provider: 'tochka' | 'prodamus'
  payments_count: number | string
  amount_native: number | string
  modules_sold: number | string
}

const PROVIDER_BY_CURRENCY: Record<'RUB' | 'EUR', AcquirerProvider> = {
  RUB: 'tochka',
  EUR: 'prodamus',
}

function emptySide(): RevenueSide {
  return {
    gross: 0,
    grossUsd: 0,
    net: 0,
    netUsd: 0,
    paymentsCount: 0,
    modulesSold: 0,
  }
}

export async function getRevenue(periodDays: number): Promise<RevenueByPeriod> {
  const supabase = createAdminClient()
  const sinceIso = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('revenue_daily')
    .select('day, amount_currency, payment_provider, payments_count, amount_native, modules_sold')
    .gte('day', sinceIso.slice(0, 10))

  const rows = (data ?? []) as RevenueRow[]

  const [usdRubRate, usdEurRate] = await Promise.all([
    getExchangeRate('USD', 'RUB'),
    getExchangeRate('USD', 'EUR'),
  ])

  const ru = emptySide()
  const eu = emptySide()
  const dailyMap = new Map<string, { grossUsd: number; netUsd: number }>()

  for (const row of rows) {
    const currency = row.amount_currency
    if (currency !== 'RUB' && currency !== 'EUR') continue

    const provider = PROVIDER_BY_CURRENCY[currency]
    const amountNative = Number(row.amount_native)
    const paymentsCount = Number(row.payments_count)
    const modulesSold = Number(row.modules_sold)

    const breakdown = applyCommission(amountNative, provider)

    const rate = currency === 'RUB' ? usdRubRate : usdEurRate
    const grossUsd = rate > 0 ? breakdown.gross / rate : 0
    const netUsd = rate > 0 ? breakdown.net / rate : 0

    const side = currency === 'RUB' ? ru : eu
    side.gross += breakdown.gross
    side.grossUsd += grossUsd
    side.net += breakdown.net
    side.netUsd += netUsd
    side.paymentsCount += paymentsCount
    side.modulesSold += modulesSold

    const dailyEntry = dailyMap.get(row.day) ?? { grossUsd: 0, netUsd: 0 }
    dailyEntry.grossUsd += grossUsd
    dailyEntry.netUsd += netUsd
    dailyMap.set(row.day, dailyEntry)
  }

  const daily = Array.from(dailyMap.entries())
    .map(([date, v]) => ({ date, grossUsd: v.grossUsd, netUsd: v.netUsd }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  return {
    periodDays,
    ru,
    eu,
    total: {
      grossUsd: ru.grossUsd + eu.grossUsd,
      netUsd: ru.netUsd + eu.netUsd,
      paymentsCount: ru.paymentsCount + eu.paymentsCount,
      modulesSold: ru.modulesSold + eu.modulesSold,
    },
    daily,
  }
}

/**
 * Конвертация из minor-units в USD на лету.
 * payments хранит amount_minor (копейки/центы) — для разовых вычислений
 * вне revenue_daily (например, при апруве платежа).
 */
export async function paymentMinorToUsd(
  amountMinor: number,
  currency: 'RUB' | 'EUR'
): Promise<number> {
  const major = amountMinor / 100
  return convertToUsd(major, currency)
}
