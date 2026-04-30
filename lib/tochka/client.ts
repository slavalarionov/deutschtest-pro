/**
 * Tochka acquiring API client.
 *
 * Server-only. Wraps `POST /acquiring/v1.0/payments_with_receipt` for the
 * canonical purchase path (Бизнес.Ру takes care of the receipt → ОФД →
 * ФНС after that), `GET /acquiring/v1.0/payments/{id}` for status polls
 * and `POST .../{id}/refund` for refunds.
 *
 * The create-payment body uses a flat `Data` shape — the `Operation[]`
 * envelope from the changelog turned out NOT to apply to this endpoint
 * (Tochka returned 400 «Field amount/purpose/paymentMode/Client/Items
 * required» when wrapped in `Operation[]`, payload captured via
 * TOCHKA_DEBUG_REQUESTS in commit cdadc31). Required fields therefore
 * sit directly on `Data`: `customerCode`, `merchantId` (15-digit siteUid),
 * `amount`, `purpose`, `paymentMode`, `redirectUrl`, `Items[]` (fiscal
 * data) and `Client.email`.
 *
 * Amounts cross the function boundary in minor units (`amountMinor`);
 * they are converted to a major-unit decimal string at the wire to keep
 * them out of float arithmetic entirely.
 *
 * Errors fork into TochkaApiError (4xx — caller's fault, surface to user)
 * and TochkaServerError (5xx — provider issue, retryable upstream).
 */
import { getTochkaEnv } from '@/lib/env'
import { getPackage, minorToMajorString, type PackageId } from '@/lib/pricing'
import {
  CreatePaymentResponseSchema,
  PaymentInfoResponseSchema,
  TochkaApiError,
  TochkaServerError,
  type CreatePaymentRequest,
  type CreatePaymentResponse,
  type PaymentInfoResponse,
  type PaymentOperationInfo,
} from './types'

function buildUrl(path: string): string {
  const env = getTochkaEnv()
  const base = env.TOCHKA_API_BASE_URL.endsWith('/')
    ? env.TOCHKA_API_BASE_URL
    : `${env.TOCHKA_API_BASE_URL}/`
  const trimmed = path.startsWith('/') ? path.slice(1) : path
  return `${base}${trimmed}`
}

/**
 * Recursively deep-clones `value` and replaces values whose key (case-
 * insensitive) matches a sensitive name with `'***masked***'`. Never
 * mutates the input — produces a fresh structure safe to log.
 *
 * Exported for unit tests; keep the sensitive-key list in sync with
 * the security review checklist.
 */
const SENSITIVE_KEYS = new Set(['customercode', 'email', 'jwt', 'authorization'])

export function maskSensitive(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.map((v) => maskSensitive(v))
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = '***masked***'
      } else {
        out[k] = maskSensitive(v)
      }
    }
    return out
  }
  return value
}

async function request<T>(
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown },
): Promise<T> {
  const env = getTochkaEnv()
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.TOCHKA_JWT_TOKEN}`,
    Accept: 'application/json',
  }
  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  // Diagnostic outbound log — flip TOCHKA_DEBUG_REQUESTS=1 in env to enable.
  // Bodies are masked through maskSensitive so customerCode / email / JWT /
  // Authorization never end up in stdout.
  if (
    process.env.TOCHKA_DEBUG_REQUESTS === '1' &&
    path.startsWith('acquiring/')
  ) {
    console.log('[tochka] →', init.method, path)
    if (init.body !== undefined) {
      console.log(
        '[tochka] body:',
        JSON.stringify(maskSensitive(init.body), null, 2),
      )
    }
  }

  const res = await fetch(buildUrl(path), {
    method: init.method,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  })

  const text = await res.text()
  let parsed: unknown = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = text
  }

  if (res.status >= 500) {
    throw new TochkaServerError(res.status, parsed)
  }
  if (!res.ok) {
    // Always log on 4xx — diagnosing structural rejections is impossible
    // without seeing what we actually sent. Both payloads are masked.
    console.error('[tochka] ✗', res.status, path)
    console.error('[tochka] response:', JSON.stringify(parsed))
    if (init.body !== undefined) {
      try {
        console.error(
          '[tochka] request body:',
          JSON.stringify(maskSensitive(init.body), null, 2),
        )
      } catch {
        /* ignore — best-effort */
      }
    }
    const message =
      (parsed as { Errors?: Array<{ message?: string }> })?.Errors?.[0]
        ?.message ?? `Tochka API ${res.status}`
    throw new TochkaApiError(res.status, message, parsed)
  }

  return parsed as T
}

/**
 * Receipt line-item name. If we ever change the wording, update the Notion
 * page «📐 Cursor Rules → Бизнес-логика чека» to match.
 */
function getReceiptItemName(packageId: PackageId): string {
  const pkg = getPackage(packageId)
  if (!pkg) throw new Error(`Unknown packageId: ${packageId}`)
  const tierName = pkg.tier.charAt(0).toUpperCase() + pkg.tier.slice(1)
  return `Пакет ${tierName} — ${pkg.modules} модулей AI-экзамена немецкого`
}

export async function createPayment(
  params: CreatePaymentRequest,
): Promise<{ operationId: string; paymentLink: string }> {
  const env = getTochkaEnv()

  if (!Number.isInteger(params.amountMinor) || params.amountMinor <= 0) {
    throw new Error(`Invalid amountMinor: ${params.amountMinor}`)
  }

  const pkg = getPackage(params.packageId)
  if (!pkg) {
    throw new Error(`Unknown packageId: ${params.packageId}`)
  }
  if (pkg.market !== 'ru') {
    throw new Error(
      `createPayment via Tochka called with non-RU package: ${params.packageId}. ` +
        'EU packages must go through Prodamus (not yet implemented).',
    )
  }

  const amountStr = minorToMajorString(params.amountMinor)
  const itemName = getReceiptItemName(params.packageId)
  const purpose = itemName

  const body = {
    Data: {
      customerCode: env.TOCHKA_CUSTOMER_CODE,
      merchantId: env.TOCHKA_MERCHANT_ID,
      amount: amountStr,
      purpose: purpose.slice(0, 140),
      paymentMode: ['card', 'sbp'],
      redirectUrl: params.redirectUrl,
      ...(params.failRedirectUrl
        ? { failRedirectUrl: params.failRedirectUrl }
        : {}),
      Items: [
        {
          vatType: 'none',
          name: itemName.slice(0, 128),
          amount: amountStr,
          quantity: 1,
          paymentMethod: 'full_payment',
          paymentObject: 'service',
        },
      ],
      Client: { email: params.clientEmail },
    },
  }

  const raw = await request<unknown>('acquiring/v1.0/payments_with_receipt', {
    method: 'POST',
    body,
  })

  const parsed: CreatePaymentResponse = CreatePaymentResponseSchema.parse(raw)
  return {
    operationId: parsed.Data.operationId,
    paymentLink: parsed.Data.paymentLink,
  }
}

/**
 * Returns the per-operation info from `GET /acquiring/v1.0/payments/{id}`,
 * already flattened — callers see `info.status`, not `info.Data.status` or
 * `info.Data.Operation[0].status`. The bank serves the data either as a
 * flat `Data` record or wrapped in `Data.Operation[]`; the schema accepts
 * both, this function extracts the inner shape transparently.
 *
 * On a Zod parse error the raw response is logged so unexpected future
 * shapes can be diagnosed in one round-trip instead of two.
 */
export async function getPaymentInfo(
  operationId: string,
): Promise<PaymentOperationInfo> {
  const raw = await request<unknown>(
    `acquiring/v1.0/payments/${encodeURIComponent(operationId)}`,
    { method: 'GET' },
  )

  let parsed: PaymentInfoResponse
  try {
    parsed = PaymentInfoResponseSchema.parse(raw)
  } catch (zodErr) {
    console.error('[tochka] getPaymentInfo: failed to parse response')
    console.error('[tochka] raw response:', JSON.stringify(raw))
    throw zodErr
  }

  // Both branches of the Data union pass through unknown extra keys, which
  // foils plain `'Operation' in …` narrowing. Discriminate at runtime.
  const data = parsed.Data as
    | PaymentOperationInfo
    | { Operation: PaymentOperationInfo[] }
  if ('Operation' in data && Array.isArray(data.Operation)) {
    return data.Operation[0]
  }
  return data as PaymentOperationInfo
}

export async function refundPayment(
  operationId: string,
  amountMinor: number,
): Promise<void> {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new Error(`Invalid amountMinor: ${amountMinor}`)
  }
  await request(
    `acquiring/v1.0/payments/${encodeURIComponent(operationId)}/refund`,
    {
      method: 'POST',
      body: {
        Data: { amount: minorToMajorString(amountMinor) },
      },
    },
  )
}
