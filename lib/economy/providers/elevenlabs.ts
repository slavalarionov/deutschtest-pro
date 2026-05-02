/**
 * ElevenLabs subscription / balance.
 *
 * Endpoint: GET /v1/user/subscription
 * Auth:     header xi-api-key (тот же ключ, что для TTS)
 *
 * IP Timeweb (FRA-1) заблокирован WAF'ом ElevenLabs, поэтому в проде
 * запросы идут через Cloudflare Worker — переменная
 * ELEVENLABS_API_URL_OVERRIDE плюс shared secret в x-proxy-secret
 * (см. lib/elevenlabs.ts). Здесь переиспользуем ту же конфигурацию.
 *
 * Стоимость 1000 символов — $0.30 (см. lib/ai-pricing.ts).
 * Оценочный остаток в USD = remaining_chars × 0.30 / 1000.
 */

const ELEVENLABS_API_URL =
  process.env.ELEVENLABS_API_URL_OVERRIDE || 'https://api.elevenlabs.io/v1'

const PRICE_PER_1K_CHARS_USD = 0.3
const CACHE_TTL_MS = 60 * 1000

export interface ElevenLabsBalance {
  charactersUsed: number
  charactersTotal: number
  charactersRemaining: number
  estimatedRemainingUsd: number
  tier: string
  status: string
  nextResetAt: Date | null
  fetchedAt: Date
}

interface SubscriptionResponse {
  character_count?: number
  character_limit?: number
  tier?: string
  status?: string
  next_character_count_reset_unix?: number
}

interface CacheEntry {
  data: ElevenLabsBalance
  cachedAt: number
}

let memoryCache: CacheEntry | null = null

function getProxyHeaders(): Record<string, string> {
  if (!process.env.ELEVENLABS_API_URL_OVERRIDE) return {}
  const secret = process.env.ELEVENLABS_PROXY_SECRET
  if (!secret) return {}
  return { 'x-proxy-secret': secret }
}

export async function getElevenLabsBalance(): Promise<ElevenLabsBalance | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    console.warn('[economy/elevenlabs] ELEVENLABS_API_KEY missing')
    return null
  }

  const now = Date.now()
  if (memoryCache && now - memoryCache.cachedAt < CACHE_TTL_MS) {
    return memoryCache.data
  }

  let res: Response
  try {
    res = await fetch(`${ELEVENLABS_API_URL}/user/subscription`, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; DeutschTest/1.0; +https://deutschtest.pro)',
        ...getProxyHeaders(),
      },
    })
  } catch (err) {
    console.warn(
      '[economy/elevenlabs] fetch failed:',
      err instanceof Error ? err.message : String(err)
    )
    return null
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.warn(
      `[economy/elevenlabs] subscription ${res.status}: ${body.slice(0, 200)}`
    )
    return null
  }

  let json: SubscriptionResponse
  try {
    json = (await res.json()) as SubscriptionResponse
  } catch (err) {
    console.warn(
      '[economy/elevenlabs] invalid JSON:',
      err instanceof Error ? err.message : String(err)
    )
    return null
  }

  const used = Number(json.character_count ?? 0)
  const total = Number(json.character_limit ?? 0)
  const remaining = Math.max(0, total - used)
  const tier = String(json.tier ?? 'unknown')
  const status = String(json.status ?? 'unknown')
  const nextResetAt =
    typeof json.next_character_count_reset_unix === 'number' &&
    json.next_character_count_reset_unix > 0
      ? new Date(json.next_character_count_reset_unix * 1000)
      : null

  const balance: ElevenLabsBalance = {
    charactersUsed: used,
    charactersTotal: total,
    charactersRemaining: remaining,
    estimatedRemainingUsd: (remaining * PRICE_PER_1K_CHARS_USD) / 1000,
    tier,
    status,
    nextResetAt,
    fetchedAt: new Date(),
  }

  memoryCache = { data: balance, cachedAt: now }
  return balance
}

export function __resetElevenLabsBalanceCacheForTests(): void {
  memoryCache = null
}
