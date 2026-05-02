/**
 * Курсы валют для конверсии выручки в USD.
 *
 * Источник: frankfurter.dev (открытое API на базе ECB, без ключа).
 * Кеш: БД (exchange_rates, TTL 24ч) + in-memory (60с) поверх.
 * Fallback: последняя любая запись из БД, иначе константы из сидинга.
 *
 * Никогда не бросает — UI и серверные расчёты должны иметь хоть какой-то
 * курс, даже если внешний API недоступен.
 */

import { createAdminClient } from '@/lib/supabase/admin'

const EXCHANGE_API_BASE = 'https://api.frankfurter.dev/v2'
const SOURCE = 'frankfurter.dev'

const DB_TTL_MS = 24 * 60 * 60 * 1000
const MEMORY_TTL_MS = 60 * 1000

// Жёсткий fallback на крайний случай — если БД пуста и API недоступен.
const HARD_FALLBACK: Record<string, number> = {
  'USD-RUB': 95,
  'USD-EUR': 0.92,
}

type Currency = 'USD' | 'RUB' | 'EUR'

interface MemoryEntry {
  rate: number
  cachedAt: number
}

const memoryCache = new Map<string, MemoryEntry>()

function pairKey(base: Currency, quote: Currency): string {
  return `${base}-${quote}`
}

async function fetchFromApi(base: Currency, quote: Currency): Promise<number | null> {
  try {
    const res = await fetch(`${EXCHANGE_API_BASE}/rate/${base}/${quote}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const json = (await res.json()) as { rate?: number }
    if (typeof json.rate !== 'number' || !Number.isFinite(json.rate) || json.rate <= 0) {
      return null
    }
    return json.rate
  } catch {
    return null
  }
}

async function readLatestFromDb(
  base: Currency,
  quote: Currency
): Promise<{ rate: number; fetched_at: string } | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('exchange_rates')
    .select('rate, fetched_at')
    .eq('base_currency', base)
    .eq('quote_currency', quote)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return { rate: Number(data.rate), fetched_at: data.fetched_at }
}

async function writeToDb(base: Currency, quote: Currency, rate: number): Promise<void> {
  const supabase = createAdminClient()
  await supabase
    .from('exchange_rates')
    .insert({ base_currency: base, quote_currency: quote, rate, source: SOURCE })
}

export async function getExchangeRate(base: Currency, quote: Currency): Promise<number> {
  if (base === quote) return 1

  const key = pairKey(base, quote)
  const now = Date.now()

  const mem = memoryCache.get(key)
  if (mem && now - mem.cachedAt < MEMORY_TTL_MS) {
    return mem.rate
  }

  const latest = await readLatestFromDb(base, quote)
  if (latest) {
    const ageMs = now - new Date(latest.fetched_at).getTime()
    if (ageMs < DB_TTL_MS) {
      memoryCache.set(key, { rate: latest.rate, cachedAt: now })
      return latest.rate
    }
  }

  const fresh = await fetchFromApi(base, quote)
  if (fresh != null) {
    await writeToDb(base, quote, fresh).catch(() => {})
    memoryCache.set(key, { rate: fresh, cachedAt: now })
    return fresh
  }

  if (latest) {
    memoryCache.set(key, { rate: latest.rate, cachedAt: now })
    return latest.rate
  }

  const hard = HARD_FALLBACK[key]
  if (hard != null) {
    memoryCache.set(key, { rate: hard, cachedAt: now })
    return hard
  }

  return 1
}

export async function convertToUsd(amount: number, fromCurrency: Currency): Promise<number> {
  if (fromCurrency === 'USD') return amount
  const rate = await getExchangeRate('USD', fromCurrency)
  if (rate <= 0) return 0
  return amount / rate
}

export function __resetExchangeRateMemoryCacheForTests(): void {
  memoryCache.clear()
}
