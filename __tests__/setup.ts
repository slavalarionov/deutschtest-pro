// Test setup. Provides predictable env defaults for the Tochka client and
// resets caches between specs so tests don't bleed key material into each
// other. Real env values can still override via `vi.stubEnv` inside a test.
import { afterEach, beforeAll } from 'vitest'

beforeAll(() => {
  process.env.TOCHKA_JWT_TOKEN = process.env.TOCHKA_JWT_TOKEN ?? 'test-jwt-token'
  process.env.TOCHKA_CUSTOMER_CODE =
    process.env.TOCHKA_CUSTOMER_CODE ?? '300000000'
  process.env.TOCHKA_API_BASE_URL =
    process.env.TOCHKA_API_BASE_URL ?? 'https://enter.tochka.com/uapi/'
  process.env.TOCHKA_WEBHOOK_PUBLIC_KEY =
    process.env.TOCHKA_WEBHOOK_PUBLIC_KEY ?? ''
  process.env.NEXT_PUBLIC_APP_URL =
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://deutschtest.pro'
})

afterEach(async () => {
  const mod = await import('@/lib/tochka/webhook')
  if (typeof mod._resetTochkaWebhookKeyCache === 'function') {
    mod._resetTochkaWebhookKeyCache()
  }
})
