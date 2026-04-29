/**
 * Server-only env validation. Lazy: each `getXEnv()` validates only when
 * called, so the build doesn't break locally when an unrelated env block
 * is unset.
 *
 * Tochka acquiring env vars:
 *   TOCHKA_JWT_TOKEN          — long-lived bearer JWT from the cabinet.
 *   TOCHKA_CUSTOMER_CODE      — 9+ digit customer (the Business entity).
 *   TOCHKA_MERCHANT_ID        — 15-digit siteUid of the retail point inside
 *                               internet acquiring. Get it via
 *                               `npx tsx scripts/check-tochka-retailers.ts`.
 *   TOCHKA_WEBHOOK_PUBLIC_KEY — RS256 PEM or JWK. Optional: while empty,
 *                               the integration runs on the polling
 *                               fallback in /api/payments/[orderId]/status.
 *   TOCHKA_API_BASE_URL       — overridable, defaults to production.
 */
import { z } from 'zod'

const tochkaEnvSchema = z.object({
  TOCHKA_JWT_TOKEN: z.string().min(1, 'TOCHKA_JWT_TOKEN is required'),
  TOCHKA_CUSTOMER_CODE: z
    .string()
    .regex(/^3\d{8,}$/, 'TOCHKA_CUSTOMER_CODE must be 9+ digits starting with 3'),
  TOCHKA_MERCHANT_ID: z
    .string()
    .regex(
      /^\d{15}$/,
      'Tochka merchantId must be 15 digits. Get it via npx tsx scripts/check-tochka-retailers.ts',
    ),
  TOCHKA_WEBHOOK_PUBLIC_KEY: z.string().optional().default(''),
  TOCHKA_API_BASE_URL: z
    .string()
    .url()
    .default('https://enter.tochka.com/uapi/'),
})

export type TochkaEnv = z.infer<typeof tochkaEnvSchema>

let cachedTochkaEnv: TochkaEnv | null = null

export function getTochkaEnv(): TochkaEnv {
  if (cachedTochkaEnv) return cachedTochkaEnv
  const parsed = tochkaEnvSchema.safeParse({
    TOCHKA_JWT_TOKEN: process.env.TOCHKA_JWT_TOKEN,
    TOCHKA_CUSTOMER_CODE: process.env.TOCHKA_CUSTOMER_CODE,
    TOCHKA_MERCHANT_ID: process.env.TOCHKA_MERCHANT_ID,
    TOCHKA_WEBHOOK_PUBLIC_KEY: process.env.TOCHKA_WEBHOOK_PUBLIC_KEY,
    TOCHKA_API_BASE_URL: process.env.TOCHKA_API_BASE_URL,
  })
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`Tochka env vars are misconfigured:\n${issues}`)
  }
  cachedTochkaEnv = parsed.data
  return cachedTochkaEnv
}

const appEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
})

export function getAppUrl(): string {
  const parsed = appEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  })
  if (!parsed.success) {
    throw new Error('NEXT_PUBLIC_APP_URL must be a valid URL')
  }
  return parsed.data.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
}
