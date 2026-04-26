/**
 * Достаёт реальный IP клиента, корректно работая через цепочку
 * Cloudflare → Vercel edge → Next.js handler.
 *
 * Приоритет источников:
 *   1. cf-connecting-ip — выставляет Cloudflare; единственный источник правды,
 *      когда трафик проксируется через CF. Vercel сохраняет этот заголовок.
 *   2. x-real-ip       — выставляет ряд reverse-proxy без CF.
 *   3. x-forwarded-for — стандартная цепочка прокси; берём первый IP (клиентский,
 *      остальные — промежуточные proxy).
 *
 * Возвращает null, если IP не удалось определить. Вызывающий код решает,
 * как трактовать null (rate-limit обычно использует ключ 'unknown').
 */

type RequestLike = { headers: Pick<Headers, 'get'> }

export function getClientIp(request: RequestLike): string | null {
  const cfIp = request.headers.get('cf-connecting-ip')
  if (cfIp) {
    const trimmed = cfIp.trim()
    if (trimmed) return trimmed
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    const trimmed = realIp.trim()
    if (trimmed) return trimmed
  }

  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim()
    if (firstIp) return firstIp
  }

  return null
}
