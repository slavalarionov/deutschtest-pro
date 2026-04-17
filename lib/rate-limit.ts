/**
 * Простой in-memory rate limiter по ключу (обычно IP).
 *
 * TODO: заменить на Upstash Redis при росте трафика / переходе на серверless,
 * где каждая лямбда получает отдельный heap и in-memory счётчик теряется
 * между вызовами. На текущем объёме (≈10 регистраций в сутки) текущий
 * fallback эффективен — Vercel держит warm-инстансы Node функций,
 * и большинство запросов попадают на тот же процесс.
 *
 * Ограничение: ключ хранится в памяти конкретного инстанса. Если Vercel
 * масштабирует на N инстансов, реальный лимит = limit * N. Для целей
 * отсечки спам-ботов этого хватает — бот всё равно упирается в Turnstile
 * и email confirmation.
 */

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + windowMs }
    buckets.set(key, bucket)
    sweepIfNeeded(now)
    return { allowed: true, remaining: limit - 1, resetAt: bucket.resetAt }
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count += 1
  return {
    allowed: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  }
}

let lastSweep = 0
function sweepIfNeeded(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k)
  }
}

/** Извлекает IP из заголовков Vercel/Cloudflare. */
export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const xri = headers.get('x-real-ip')
  if (xri) return xri.trim()
  return 'unknown'
}
