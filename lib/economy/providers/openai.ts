/**
 * OpenAI Costs API (Admin Key only).
 *
 * Endpoint: GET https://api.openai.com/v1/organization/costs
 * Auth:     Authorization: Bearer ${OPENAI_ADMIN_KEY}
 *
 * Параметры:
 *   start_time   — Unix seconds, обязательно
 *   end_time     — опционально
 *   bucket_width — '1d' (единственное значение)
 *   limit        — макс число бакетов (1..180)
 *
 * Ответ:
 *   { data: [{ start_time, end_time, results: [{ amount: { value, currency } }] }], next_page }
 *
 * У free-аккаунтов Costs API не активен. Если ENV отсутствует или
 * ответ не 200 — return null. Используется параллельно нашему
 * ai_usage_log для сверки.
 */

const OPENAI_COSTS_URL = 'https://api.openai.com/v1/organization/costs'
const CACHE_TTL_MS = 5 * 60 * 1000
const SECONDS_PER_DAY = 24 * 60 * 60

export interface OpenAiCostBucket {
  date: string
  amountUsd: number
}

export interface OpenAiCostsSummary {
  total30dUsd: number
  total7dUsd: number
  today24hUsd: number
  daily: OpenAiCostBucket[]
  fetchedAt: Date
}

interface RawAmount {
  value?: number
  currency?: string
}

interface RawResult {
  amount?: RawAmount | null
}

interface RawBucket {
  start_time?: number
  end_time?: number
  results?: RawResult[]
}

interface RawResponse {
  data?: RawBucket[]
  next_page?: string | null
}

interface CacheEntry {
  data: OpenAiCostsSummary
  cachedAt: number
}

let memoryCache: CacheEntry | null = null

function unixDayKey(unix: number): string {
  return new Date(unix * 1000).toISOString().slice(0, 10)
}

export async function getOpenAiCosts(): Promise<OpenAiCostsSummary | null> {
  const adminKey = process.env.OPENAI_ADMIN_KEY
  if (!adminKey) return null

  const now = Date.now()
  if (memoryCache && now - memoryCache.cachedAt < CACHE_TTL_MS) {
    return memoryCache.data
  }

  const nowUnix = Math.floor(now / 1000)
  const startUnix = nowUnix - 30 * SECONDS_PER_DAY

  const url = new URL(OPENAI_COSTS_URL)
  url.searchParams.set('start_time', String(startUnix))
  url.searchParams.set('bucket_width', '1d')
  url.searchParams.set('limit', '31')

  let res: Response
  try {
    res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminKey}`,
        Accept: 'application/json',
      },
    })
  } catch (err) {
    console.warn(
      '[economy/openai] fetch failed:',
      err instanceof Error ? err.message : String(err)
    )
    return null
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.warn(
      `[economy/openai] costs ${res.status}: ${body.slice(0, 200)}`
    )
    return null
  }

  let json: RawResponse
  try {
    json = (await res.json()) as RawResponse
  } catch (err) {
    console.warn(
      '[economy/openai] invalid JSON:',
      err instanceof Error ? err.message : String(err)
    )
    return null
  }

  const dailyMap = new Map<string, number>()
  let total30d = 0
  let total7d = 0
  let today24h = 0

  const since7dUnix = nowUnix - 7 * SECONDS_PER_DAY
  const since24hUnix = nowUnix - SECONDS_PER_DAY

  for (const bucket of json.data ?? []) {
    const startTime = typeof bucket.start_time === 'number' ? bucket.start_time : null
    if (startTime === null) continue

    let bucketUsd = 0
    for (const r of bucket.results ?? []) {
      const value = r.amount?.value
      const currency = r.amount?.currency
      if (typeof value !== 'number' || !Number.isFinite(value)) continue
      if (currency && currency.toLowerCase() !== 'usd') continue
      bucketUsd += value
    }

    const day = unixDayKey(startTime)
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + bucketUsd)

    total30d += bucketUsd
    if (startTime >= since7dUnix) total7d += bucketUsd
    if (startTime >= since24hUnix) today24h += bucketUsd
  }

  const daily: OpenAiCostBucket[] = Array.from(dailyMap.entries())
    .map(([date, amountUsd]) => ({ date, amountUsd }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  const summary: OpenAiCostsSummary = {
    total30dUsd: total30d,
    total7dUsd: total7d,
    today24hUsd: today24h,
    daily,
    fetchedAt: new Date(),
  }

  memoryCache = { data: summary, cachedAt: now }
  return summary
}

export function __resetOpenAiCostsCacheForTests(): void {
  memoryCache = null
}
